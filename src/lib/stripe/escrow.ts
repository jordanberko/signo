import { getStripe } from './config';
import { createTransfer } from './connect';
import { createClient } from '@supabase/supabase-js';
import { sendPayoutReleased } from '@/lib/email';

// Service role client — bypasses RLS for server-side operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Types ──

interface EscrowOrder {
  id: string;
  artist_id: string;
  total_amount_aud: number;
  artist_payout_aud: number;
  stripe_payment_intent_id: string | null;
  stripe_account_id: string | null; // from joined profile
}

// ── Fund Release ──

/**
 * Release escrowed funds to the artist's Stripe Connect account.
 *
 * Transfer amount = total_amount_aud - stripe_fee
 * (artist_payout_aud is pre-calculated with zero commission)
 *
 * Steps:
 *   1. Fetch order + artist's stripe_account_id
 *   2. Validate the artist has a connected account
 *   3. Transfer funds via Stripe Transfer API
 *   4. Mark order as completed with payout timestamp
 */
export async function releaseFunds(orderId: string): Promise<{
  success: boolean;
  transferId?: string;
  error?: string;
}> {
  const supabase = getServiceClient();

  // Fetch order with artist's Connect account ID
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, artist_id, total_amount_aud, artist_payout_aud, stripe_payment_intent_id, profiles!orders_artist_id_fkey(stripe_account_id)'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: `Order not found: ${orderId}` };
  }

  const profileData = order.profiles as unknown as
    | Record<string, string | null>
    | Record<string, string | null>[]
    | null;
  const profile = Array.isArray(profileData) ? profileData[0] : profileData;
  const connectAccountId = profile?.stripe_account_id;

  if (!connectAccountId) {
    return {
      success: false,
      error: `Artist ${order.artist_id} has no Stripe Connect account`,
    };
  }

  const payoutAmountAud = order.artist_payout_aud ?? order.total_amount_aud ?? 0;
  const payoutCents = Math.round(payoutAmountAud * 100);

  if (payoutCents <= 0) {
    return { success: false, error: `Invalid payout amount: ${payoutAmountAud}` };
  }

  try {
    // Transfer funds to artist
    const transfer = await createTransfer(payoutCents, connectAccountId, orderId);

    // Update order status
    await supabase
      .from('orders')
      .update({
        status: 'completed',
        payout_released_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    console.log(
      `[Escrow] Released $${payoutAmountAud} to ${connectAccountId} for order ${orderId} (transfer: ${transfer.id})`
    );

    return { success: true, transferId: transfer.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown transfer error';
    console.error(`[Escrow] Transfer failed for order ${orderId}:`, message);
    return { success: false, error: message };
  }
}

// ── Refund ──

/**
 * Refund the buyer's payment for an order.
 * Uses the original payment intent to issue a full refund.
 */
export async function refundBuyer(orderId: string): Promise<{
  success: boolean;
  refundId?: string;
  error?: string;
}> {
  const supabase = getServiceClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, stripe_payment_intent_id, status')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: `Order not found: ${orderId}` };
  }

  if (!order.stripe_payment_intent_id) {
    return {
      success: false,
      error: `No payment intent for order ${orderId}`,
    };
  }

  // Don't refund already refunded/completed orders
  if (['refunded', 'completed', 'cancelled'].includes(order.status)) {
    return {
      success: false,
      error: `Order ${orderId} is already ${order.status}`,
    };
  }

  try {
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      metadata: {
        signo_order_id: orderId,
      },
    });

    // Update order status
    await supabase
      .from('orders')
      .update({ status: 'refunded' })
      .eq('id', orderId);

    console.log(
      `[Escrow] Refunded order ${orderId} (refund: ${refund.id})`
    );

    return { success: true, refundId: refund.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown refund error';
    console.error(`[Escrow] Refund failed for order ${orderId}:`, message);
    return { success: false, error: message };
  }
}

// ── Auto-release logic ──

/**
 * Find all orders past their inspection deadline and release funds.
 * Called by the hourly cron job.
 *
 * Criteria:
 *   - status = 'delivered'
 *   - inspection_deadline < now()
 *   - No open dispute (status would be 'disputed' if there was one)
 */
export async function autoReleaseFunds(): Promise<{
  released: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getServiceClient();
  const now = new Date().toISOString();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, artist_id, artwork_id, artist_payout_aud')
    .eq('status', 'delivered')
    .lt('inspection_deadline', now)
    .is('payout_released_at', null);

  if (error) {
    console.error('[Escrow Auto-Release] Query error:', error);
    return { released: 0, failed: 0, errors: [error.message] };
  }

  if (!orders || orders.length === 0) {
    console.log('[Escrow Auto-Release] No orders to release');
    return { released: 0, failed: 0, errors: [] };
  }

  console.log(`[Escrow Auto-Release] Found ${orders.length} orders to release`);

  let released = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const order of orders) {
    const result = await releaseFunds(order.id);
    if (result.success) {
      released++;

      // Send payout released email (fire-and-forget)
      const [artistResult, artworkResult] = await Promise.all([
        supabase.from('profiles').select('email, full_name').eq('id', order.artist_id).single(),
        supabase.from('artworks').select('title').eq('id', order.artwork_id).single(),
      ]);

      if (artistResult.data?.email) {
        sendPayoutReleased({
          artistEmail: artistResult.data.email,
          artistName: artistResult.data.full_name || '',
          orderId: order.id,
          artworkTitle: artworkResult.data?.title || 'Artwork',
          payoutAmount: order.artist_payout_aud || 0,
        }).catch((err) => console.error(`[Escrow Auto-Release] Payout email failed for ${order.id}:`, err));
      }
    } else {
      failed++;
      errors.push(`${order.id}: ${result.error}`);
    }
  }

  console.log(
    `[Escrow Auto-Release] Complete: ${released} released, ${failed} failed`
  );

  return { released, failed, errors };
}

// ── Cancel unshipped orders ──

/**
 * Cancel orders that haven't been shipped within 7 calendar days.
 * Refunds the buyer and re-lists the artwork.
 *
 * Uses 7 calendar days (not 5 business days) for simplicity —
 * this is slightly more generous to artists.
 */
export async function cancelUnshippedOrders(): Promise<{
  cancelled: number;
  failed: number;
  errors: string[];
}> {
  const supabase = getServiceClient();

  // 7 calendar days ago
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffIso = cutoff.toISOString();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, artwork_id')
    .eq('status', 'paid')
    .lt('created_at', cutoffIso);

  if (error) {
    console.error('[Cancel Unshipped] Query error:', error);
    return { cancelled: 0, failed: 0, errors: [error.message] };
  }

  if (!orders || orders.length === 0) {
    console.log('[Cancel Unshipped] No unshipped orders to cancel');
    return { cancelled: 0, failed: 0, errors: [] };
  }

  console.log(
    `[Cancel Unshipped] Found ${orders.length} unshipped orders to cancel`
  );

  let cancelled = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const order of orders) {
    // Refund the buyer
    const result = await refundBuyer(order.id);

    if (result.success) {
      // Update to cancelled (refundBuyer already set 'refunded',
      // override to 'cancelled' for unshipped orders)
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      // Re-list the artwork
      await supabase
        .from('artworks')
        .update({ status: 'approved' })
        .eq('id', order.artwork_id);

      cancelled++;
      console.log(
        `[Cancel Unshipped] Cancelled order ${order.id}, re-listed artwork ${order.artwork_id}`
      );

      // TODO: Send cancellation/refund email to buyer
      // Need to build a sendOrderCancelled() email template and fetch buyer details here
    } else {
      failed++;
      errors.push(`${order.id}: ${result.error}`);
    }
  }

  console.log(
    `[Cancel Unshipped] Complete: ${cancelled} cancelled, ${failed} failed`
  );

  return { cancelled, failed, errors };
}
