// Scenario 1 — Happy-path webhook delivery, without disturbing the running dev server.
//
// Instead of `stripe listen`, we hand-sign a valid `checkout.session.completed`
// event using the webhook secret already in .env.local, and POST it to the
// webhook endpoint on the running dev server.
//
// This exercises:
//   - Signature verification (stripe.webhooks.constructEvent)
//   - Event type routing
//   - Order row insertion with zero-commission fee math
//   - Idempotent behaviour on replay

import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const envPath = '/Users/jordanberkovich/Desktop/BlueThumb Alt/signo/.env.local';
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const [k, ...rest] = l.split('=');
      return [k.trim(), rest.join('=').trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const WEBHOOK_URL = 'http://localhost:3000/api/stripe/payment-webhook';
const SECRET = env.STRIPE_PAYMENT_WEBHOOK_SECRET;

if (!SECRET?.startsWith('whsec_')) {
  console.error('ABORT: STRIPE_PAYMENT_WEBHOOK_SECRET is not whsec_*');
  process.exit(1);
}

// ── Reusable fixtures ─────────────────────────────────────────────
const ARTIST_ID = '80c2f54a-30cd-4f8d-af67-5790557f9e79';
const BUYER_ID = ARTIST_ID; // reuse — FK just needs a valid user
const ARTWORK_ID = '0c5ff10d-e877-4038-bbbd-2a8bcbb40564'; // Untitled #2, $600
const RUN_ID = Date.now();
const FAKE_PI = `pi_test_verify_${RUN_ID}`;
const FAKE_CS = `cs_test_verify_${RUN_ID}`;

// Reserve the artwork (matches what the create-session endpoint would do)
// so the webhook's "mark sold" step succeeds. We revert afterwards.
const { data: origArtwork } = await supabase
  .from('artworks')
  .select('status')
  .eq('id', ARTWORK_ID)
  .single();
const originalArtworkStatus = origArtwork?.status ?? 'approved';
console.log(`Artwork ${ARTWORK_ID} current status: ${originalArtworkStatus}`);
await supabase.from('artworks').update({ status: 'reserved' }).eq('id', ARTWORK_ID);

// ── Craft event ──────────────────────────────────────────────────
const payload = {
  id: `evt_test_verify_${RUN_ID}`,
  object: 'event',
  api_version: '2026-03-25.dahlia',
  created: Math.floor(Date.now() / 1000),
  type: 'checkout.session.completed',
  livemode: false,
  data: {
    object: {
      id: FAKE_CS,
      object: 'checkout.session',
      mode: 'payment',
      payment_intent: FAKE_PI,
      payment_status: 'paid',
      status: 'complete',
      amount_total: 60000,
      currency: 'aud',
      customer_email: 'buyer@test.local',
      metadata: {
        signo_artwork_id: ARTWORK_ID,
        signo_buyer_id: BUYER_ID,
        signo_artist_id: ARTIST_ID,
        signo_total_aud: '600',
        signo_shipping_cost_aud: '0',
        signo_category: 'original',
        signo_shipping_address: JSON.stringify({
          street: '1 Test St',
          city: 'Melbourne',
          state: 'VIC',
          postcode: '3000',
          country: 'Australia',
        }),
      },
    },
  },
};

function signPayload(rawBody, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${rawBody}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return { timestamp, signature, header: `t=${timestamp},v1=${signature}` };
}

// ── POST the event ───────────────────────────────────────────────
async function deliver(tag = '') {
  const rawBody = JSON.stringify(payload);
  const { header } = signPayload(rawBody, SECRET);
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': header,
    },
    body: rawBody,
  });
  const text = await res.text();
  console.log(`  [${tag}] status=${res.status}  body=${text.slice(0, 120)}`);
  return { status: res.status, body: text };
}

console.log('\n──── Scenario 1: happy-path webhook delivery ────');
console.log('  first delivery — expect 200 + order row created');
const first = await deliver('first');

// Allow a moment for DB write
await new Promise((r) => setTimeout(r, 500));

const { data: order, error: orderErr } = await supabase
  .from('orders')
  .select('id, status, total_amount_aud, artist_payout_aud, platform_fee_aud, stripe_payment_intent_id')
  .eq('stripe_payment_intent_id', FAKE_PI)
  .single();

let passed = true;

if (first.status !== 200) {
  console.log(`  ✗ webhook returned ${first.status} (expected 200)`);
  passed = false;
} else {
  console.log('  ✓ webhook returned 200');
}

if (orderErr || !order) {
  console.log(`  ✗ no order row created for ${FAKE_PI}: ${orderErr?.message}`);
  passed = false;
} else {
  console.log(`  ✓ order ${order.id} created`);
  console.log(`      total=$${order.total_amount_aud} platform_fee=$${order.platform_fee_aud} artist_payout=$${order.artist_payout_aud}`);
  if (order.status === 'paid') console.log(`  ✓ order status is 'paid'`);
  else {
    console.log(`  ✗ order status is '${order.status}' (expected 'paid')`);
    passed = false;
  }
  if (order.platform_fee_aud === 0) console.log(`  ✓ platform_fee_aud is 0 (zero-commission)`);
  else {
    console.log(`  ✗ platform_fee_aud is ${order.platform_fee_aud} (expected 0)`);
    passed = false;
  }
  // Stripe fee for $600 = 600 * 0.0175 + 0.30 = 10.80; payout = 589.20
  if (Math.abs(order.artist_payout_aud - 589.2) < 0.01) {
    console.log(`  ✓ artist_payout math matches (589.20 for a $600 sale)`);
  } else {
    console.log(`  ✗ artist_payout is ${order.artist_payout_aud} (expected ~589.20)`);
    passed = false;
  }
}

// Check artwork was marked sold
const { data: artworkAfter } = await supabase
  .from('artworks')
  .select('status')
  .eq('id', ARTWORK_ID)
  .single();
if (artworkAfter?.status === 'sold') {
  console.log('  ✓ artwork status flipped to sold');
} else {
  console.log(`  ✗ artwork status is '${artworkAfter?.status}' (expected 'sold')`);
  passed = false;
}

// Replay — verify idempotency (should NOT create a duplicate order)
console.log('\n  replay — expect 200 + no duplicate order');
const second = await deliver('replay');
await new Promise((r) => setTimeout(r, 300));
const { data: allOrdersForPI } = await supabase
  .from('orders')
  .select('id')
  .eq('stripe_payment_intent_id', FAKE_PI);
if (second.status === 200) console.log('  ✓ replay returned 200');
else {
  console.log(`  ✗ replay returned ${second.status}`);
  passed = false;
}
if ((allOrdersForPI?.length ?? 0) === 1) console.log('  ✓ still exactly one order row (idempotent)');
else {
  console.log(`  ✗ ${allOrdersForPI?.length ?? 0} order rows exist after replay`);
  passed = false;
}

// ── Cleanup ──────────────────────────────────────────────────────
console.log('\n  cleanup…');
if (order?.id) {
  await supabase.from('orders').delete().eq('id', order.id);
  console.log(`    deleted order ${order.id}`);
}
await supabase.from('artworks').update({ status: originalArtworkStatus }).eq('id', ARTWORK_ID);
console.log(`    restored artwork ${ARTWORK_ID} to status=${originalArtworkStatus}`);

console.log(`\n  Scenario 1: ${passed ? 'PASS' : 'FAIL'}\n`);
process.exit(passed ? 0 : 1);
