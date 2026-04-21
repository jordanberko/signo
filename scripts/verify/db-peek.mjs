// Read-only peek at Supabase state to decide how to run the scenarios.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Orders by status
const { data: orderCounts } = await supabase
  .from('orders')
  .select('status', { count: 'exact' });
const byStatus = {};
for (const o of orderCounts ?? []) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
console.log('Orders by status:', byStatus);

// 2. Profiles with a Stripe Connect account (needed for Scenario 2)
const { data: connectProfiles } = await supabase
  .from('profiles')
  .select('id, full_name, role, stripe_account_id')
  .not('stripe_account_id', 'is', null)
  .limit(5);
console.log(
  'Profiles with stripe_account_id:',
  (connectProfiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role,
    connect_id_prefix: p.stripe_account_id?.slice(0, 11),
  }))
);

// 3. Any existing delivered orders ready to release
const { data: deliverable } = await supabase
  .from('orders')
  .select('id, status, payout_released_at, artist_id, total_amount_aud')
  .eq('status', 'delivered')
  .is('payout_released_at', null)
  .limit(3);
console.log('Delivered orders awaiting payout:', deliverable);

// 4. Artworks count
const { count: artworkCount } = await supabase
  .from('artworks')
  .select('*', { count: 'exact', head: true });
console.log('Total artworks:', artworkCount);

// 5. Approved artworks (for Scenario 1 happy path)
const { data: approvedArt } = await supabase
  .from('artworks')
  .select('id, title, price_aud, artist_id')
  .eq('status', 'approved')
  .limit(2);
console.log('Approved artworks:', approvedArt);
