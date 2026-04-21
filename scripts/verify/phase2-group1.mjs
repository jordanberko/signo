// Phase 2 Group 1 verification scenarios.
// Run from the signo project root: `node scripts/verify/phase2-group1.mjs`
//
// Safe side-effects only:
//   - Reads/writes a handful of test rows in Supabase, each cleaned up after
//   - Calls test-mode Stripe (sk_test_*). No real money moves.
//   - Does not touch or mutate any existing data.
//
// This script imports the compiled app code indirectly by replicating the
// functions under test. Importing TS source from vanilla node is painful;
// tsx is available via npx but rolling our own copies keeps this script
// self-contained and explicit about what each scenario is doing.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// ── bootstrap env ────────────────────────────────────────────────
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

if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
  console.error('ABORT: STRIPE_SECRET_KEY is not sk_test_*. Refusing to run.');
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-03-25.dahlia',
});

// ── small helpers ────────────────────────────────────────────────
const log = (...args) => console.log(...args);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => console.log(`  ✗ ${msg}`);

const results = {};
const record = (name, passed, detail = '') =>
  (results[name] = { passed, detail });

// Copy of src/lib/utils.ts:calculateStripeFee
const calculateStripeFee = (a) => Math.round((a * 0.0175 + 0.30) * 100) / 100;

// Copy of src/lib/stripe/connect.ts:createTransfer (post-C1)
async function createTransfer(amountCents, accountId, orderId) {
  return await stripe.transfers.create(
    {
      amount: amountCents,
      currency: 'aud',
      destination: accountId,
      metadata: { signo_order_id: orderId },
    },
    { idempotencyKey: `transfer_order_${orderId}` }
  );
}

// Copy of src/lib/stripe/escrow.ts:releaseFunds (post-C4)
const RELEASABLE_STATUSES = new Set(['delivered', 'disputed']);
async function releaseFunds(orderId) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, artist_id, status, payout_released_at, total_amount_aud, artist_payout_aud, stripe_payment_intent_id, profiles!orders_artist_id_fkey(stripe_account_id)'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) return { success: false, error: `Order not found: ${orderId}` };

  if (!RELEASABLE_STATUSES.has(order.status))
    return { success: false, error: `Cannot release funds for order ${orderId} in status '${order.status}'` };

  if (order.payout_released_at)
    return { success: false, error: `Order ${orderId} already released at ${order.payout_released_at}` };

  const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
  const connectAccountId = profile?.stripe_account_id;
  if (!connectAccountId)
    return { success: false, error: `Artist ${order.artist_id} has no Stripe Connect account` };

  const payoutAmountAud = order.artist_payout_aud ?? order.total_amount_aud ?? 0;
  const payoutCents = Math.round(payoutAmountAud * 100);
  if (payoutCents <= 0) return { success: false, error: `Invalid payout amount: ${payoutAmountAud}` };

  try {
    const transfer = await createTransfer(payoutCents, connectAccountId, orderId);
    await supabase
      .from('orders')
      .update({ status: 'completed', payout_released_at: new Date().toISOString() })
      .eq('id', orderId);
    return { success: true, transferId: transfer.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown transfer error' };
  }
}

// ── test fixtures ────────────────────────────────────────────────
const ARTIST_ID = '80c2f54a-30cd-4f8d-af67-5790557f9e79'; // Jordan — has acct_1TKGka
const APPROVED_ARTWORK_ID = '5cd611cf-17a2-4548-831e-f0af0ef0f2ab'; // Untitled, $275
const BUYER_ID = ARTIST_ID; // reuse — FK just needs a valid user

let scenario3OrderId = null;
let scenario2OrderId = null;

// ── Scenario 4 — M2 session expiry ───────────────────────────────
log('\n──── Scenario 4: M2 — checkout session has 30-min expires_at ────');
try {
  const before = Math.floor(Date.now() / 1000);
  const s = await stripe.checkout.sessions.create({
    mode: 'payment',
    expires_at: before + 30 * 60, // matches route's expression
    line_items: [
      {
        price_data: {
          currency: 'aud',
          product_data: { name: 'Phase 2 verify — Untitled' },
          unit_amount: 27500,
        },
        quantity: 1,
      },
    ],
    success_url: 'http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'http://localhost:3000/artwork/test',
  });
  const delta = s.expires_at - s.created;
  log(`  session: ${s.id}`);
  log(`  created: ${s.created}, expires_at: ${s.expires_at}, delta: ${delta}s (${delta / 60} min)`);
  const passed = delta === 30 * 60;
  if (passed) ok('expires_at is exactly 30 minutes after created');
  else fail(`expected 1800s delta, got ${delta}s`);
  record('Scenario 4 (M2)', passed, `session ${s.id}, delta ${delta}s`);
  // Let the session naturally expire; no cleanup needed.
} catch (err) {
  fail(`Stripe rejected the expires_at call: ${err.message}`);
  record('Scenario 4 (M2)', false, err.message);
}

// ── Scenario 3 — C4 status guard ─────────────────────────────────
log('\n──── Scenario 3: C4 — releaseFunds guards against non-releasable status ────');
try {
  // Insert a test 'paid' order
  const { data: paidOrder, error: insertErr } = await supabase
    .from('orders')
    .insert({
      buyer_id: BUYER_ID,
      artwork_id: APPROVED_ARTWORK_ID,
      artist_id: ARTIST_ID,
      total_amount_aud: 100,
      platform_fee_aud: 0,
      artist_payout_aud: 100 - calculateStripeFee(100),
      stripe_payment_intent_id: `pi_test_verify_${Date.now()}`,
      status: 'paid',
    })
    .select('id')
    .single();
  if (insertErr) throw insertErr;
  scenario3OrderId = paidOrder.id;
  log(`  inserted test order ${scenario3OrderId} with status='paid'`);

  // Capture Stripe transfers count BEFORE the call
  const transfersBefore = await stripe.transfers.list({ limit: 5 });
  const transfersBeforeIds = new Set(transfersBefore.data.map((t) => t.id));

  const result = await releaseFunds(scenario3OrderId);
  log(`  releaseFunds returned:`, result);

  // Assertions
  const noSuccess = result.success === false;
  const mentionsStatus = (result.error ?? '').toLowerCase().includes('status');
  const mentionsPaid = (result.error ?? '').includes("'paid'");

  // Verify no transfer was made
  const transfersAfter = await stripe.transfers.list({ limit: 5 });
  const newTransfers = transfersAfter.data.filter((t) => !transfersBeforeIds.has(t.id));
  const noTransfer = newTransfers.length === 0;

  // Verify order status unchanged
  const { data: afterOrder } = await supabase
    .from('orders')
    .select('status, payout_released_at')
    .eq('id', scenario3OrderId)
    .single();
  const stillPaid = afterOrder?.status === 'paid';
  const notReleased = !afterOrder?.payout_released_at;

  const passed = noSuccess && mentionsStatus && mentionsPaid && noTransfer && stillPaid && notReleased;
  if (noSuccess) ok('returned success=false');
  else fail('returned success=true (should have short-circuited)');
  if (mentionsStatus && mentionsPaid) ok(`error message names the status ('paid')`);
  else fail(`error message doesn't clearly identify status: "${result.error}"`);
  if (noTransfer) ok('no Stripe transfer was created');
  else fail(`${newTransfers.length} unexpected transfer(s) created`);
  if (stillPaid) ok('order status unchanged (still paid)');
  else fail(`order status changed to '${afterOrder?.status}'`);
  if (notReleased) ok('payout_released_at is still null');
  else fail(`payout_released_at was set to ${afterOrder?.payout_released_at}`);

  record('Scenario 3 (C4)', passed, `error: ${result.error}`);
} catch (err) {
  fail(`Scenario 3 threw: ${err.message}`);
  record('Scenario 3 (C4)', false, err.message);
} finally {
  if (scenario3OrderId) {
    await supabase.from('orders').delete().eq('id', scenario3OrderId);
    log(`  cleanup: deleted test order ${scenario3OrderId}`);
  }
}

// ── Scenario 2 — C1 idempotency ──────────────────────────────────
log('\n──── Scenario 2: C1 — releaseFunds is idempotent under double invocation ────');
try {
  // Check platform test balance first — insufficient funds will mask the idempotency signal.
  const balance = await stripe.balance.retrieve();
  const availableAud = balance.available.find((b) => b.currency === 'aud')?.amount ?? 0;
  log(`  platform test balance (AUD available): ${availableAud} cents`);

  if (availableAud < 2000) {
    log('  topping up test balance via funded test charge…');
    // Create a test charge with the special "test-topup" token to simulate funding
    const charge = await stripe.charges.create({
      amount: 10000,
      currency: 'aud',
      source: 'tok_bypassPending', // instantly available test token
      description: 'Phase 2 verify — test balance top-up',
    });
    log(`  funded: ${charge.id} (${charge.amount} cents)`);
  }

  // Insert a test 'delivered' order — this test uses $20 (2000 cents) to keep well under balance
  const totalAud = 20;
  const payoutAud = totalAud - calculateStripeFee(totalAud);
  const { data: deliveredOrder, error: insertErr } = await supabase
    .from('orders')
    .insert({
      buyer_id: BUYER_ID,
      artwork_id: APPROVED_ARTWORK_ID,
      artist_id: ARTIST_ID,
      total_amount_aud: totalAud,
      platform_fee_aud: 0,
      artist_payout_aud: payoutAud,
      stripe_payment_intent_id: `pi_test_verify_${Date.now()}`,
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      inspection_deadline: new Date(Date.now() - 1000).toISOString(), // already past
    })
    .select('id, artist_payout_aud')
    .single();
  if (insertErr) throw insertErr;
  scenario2OrderId = deliveredOrder.id;
  log(`  inserted test order ${scenario2OrderId}, payout=$${deliveredOrder.artist_payout_aud}`);

  // Double-invoke — run concurrently to simulate the real race
  const [r1, r2] = await Promise.all([
    releaseFunds(scenario2OrderId),
    releaseFunds(scenario2OrderId),
  ]);
  log(`  call 1:`, r1);
  log(`  call 2:`, r2);

  // The second call likely hits the payout_released_at guard (our belt-and-braces)
  // before even reaching Stripe, because the first call flips it. That's the
  // CORRECT behaviour — it short-circuits cheaper than the Stripe idempotency
  // retry. To specifically verify the Stripe idempotency key, call again AFTER
  // manually resetting the payout flag so we exercise the Stripe path both times.
  await supabase
    .from('orders')
    .update({ status: 'delivered', payout_released_at: null })
    .eq('id', scenario2OrderId);

  const r3 = await releaseFunds(scenario2OrderId);
  log(`  call 3 (after DB reset, should hit Stripe idempotency):`, r3);

  // Pull recent transfers with our idempotency key
  const txs = await stripe.transfers.list({ limit: 10 });
  const ourTransfers = txs.data.filter(
    (t) => t.metadata?.signo_order_id === scenario2OrderId
  );
  log(`  Stripe transfers with our order_id in metadata: ${ourTransfers.length}`);
  for (const t of ourTransfers) {
    log(`    ${t.id} — ${t.amount} ${t.currency}`);
  }

  // A successful first call plus a Stripe-idempotent third call should yield
  // exactly ONE distinct transfer id, shared across calls.
  const distinctIds = new Set(
    [r1, r2, r3].filter((r) => r.success).map((r) => r.transferId)
  );
  const onlyOneTransfer = distinctIds.size === 1 && ourTransfers.length === 1;
  const noDuplicates = ourTransfers.length <= 1;

  // Either call 1 or 2 succeeded (race winner); the other short-circuited on the
  // DB guard. Call 3 should have returned the same transfer ID via Stripe
  // idempotency.
  const firstPairOk = (r1.success !== r2.success) || (r1.transferId === r2.transferId);
  const call3Ok = r3.success && r3.transferId && distinctIds.has(r3.transferId);

  if (onlyOneTransfer) ok('exactly one Stripe transfer created for the order');
  else fail(`expected 1 transfer, found ${ourTransfers.length}`);
  if (noDuplicates) ok('no duplicate transfers');
  else fail('duplicate transfers detected');
  if (firstPairOk) ok('concurrent calls: either one succeeded + one was guarded, or both returned the same transferId');
  else fail('concurrent calls produced two different successful transferIds');
  if (call3Ok) ok('post-reset call returned the same transferId (Stripe idempotency honoured)');
  else fail(`post-reset call: success=${r3.success}, transferId=${r3.transferId}`);

  const passed = onlyOneTransfer && noDuplicates && firstPairOk && call3Ok;
  record('Scenario 2 (C1)', passed, `${ourTransfers.length} transfer(s), distinct ids: ${[...distinctIds].join(', ')}`);
} catch (err) {
  fail(`Scenario 2 threw: ${err.message}`);
  record('Scenario 2 (C1)', false, err.message);
} finally {
  if (scenario2OrderId) {
    await supabase.from('orders').delete().eq('id', scenario2OrderId);
    log(`  cleanup: deleted test order ${scenario2OrderId}`);
  }
}

// ── Summary ──────────────────────────────────────────────────────
log('\n════════════════════════════════════════');
log('Summary:');
for (const [name, { passed, detail }] of Object.entries(results)) {
  log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}
log('════════════════════════════════════════\n');

process.exit(Object.values(results).every((r) => r.passed) ? 0 : 1);
