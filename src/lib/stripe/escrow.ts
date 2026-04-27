import { getStripe } from './config';
import { createTransfer } from './connect';
import { createClient } from '@supabase/supabase-js';
import { sendPayoutReleased, sendOrderCancelled, sendFirstSaleActivation } from '@/lib/email';
import { sendOpsAlert } from '@/lib/ops-alert';

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

// Only these order states may have funds released. Anything else is
// either not ready (e.g. 'paid', 'shipped'), already settled ('completed',
// 'refunded', 'cancelled'), or in the wrong lifecycle branch.
// 'delivered' is the normal escrow auto-release case.
// 'disputed' is the admin "resolved in artist's favour" path.
const RELEASABLE_STATUSES = new Set(['delivered', 'disputed']);

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
 *
 * Guards (fail fast, no Stripe call):
 *   - Order must be in a releasable status (see RELEASABLE_STATUSES).
 *   - payout_released_at must be null (double-release protection).
 *   The Stripe-side idempotency key on createTransfer is the final
 *   defence against duplicate transfers, but we also want to avoid
 *   the round-trip and the misleading "success" when the order is
 *   already completed.
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
      'id, artist_id, status, payout_released_at, total_amount_aud, artist_payout_aud, stripe_payment_intent_id, profiles!orders_artist_id_fkey(stripe_account_id)'
    )
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: `Order not found: ${orderId}` };
  }

  // Status guard — refuse to release from unexpected states
  if (!RELEASABLE_STATUSES.has(order.status)) {
    return {
      success: false,
      error: `Cannot release funds for order ${orderId} in status '${order.status}'`,
    };
  }

  // Already-released guard — belt-and-braces on top of the idempotency key
  if (order.payout_released_at) {
    return {
      success: false,
      error: `Order ${orderId} already released at ${order.payout_released_at}`,
    };
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

    // ── First Sale Detection ──
    // Check if the artist is still on trial and trigger subscription activation
    try {
      const { data: artistProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name, subscription_status')
        .eq('id', order.artist_id)
        .single();

      if (artistProfile?.subscription_status === 'trial') {
        // Atomic update: the eq on subscription_status prevents race conditions
        // if two sales complete simultaneously
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'pending_activation',
            grace_period_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            first_sale_completed_at: new Date().toISOString(),
          })
          .eq('id', order.artist_id)
          .eq('subscription_status', 'trial');

        if (!updateError && artistProfile.email) {
          // Resolve artwork title from order's artwork_id
          let artworkTitle = 'your artwork';
          const { data: orderData } = await supabase
            .from('orders')
            .select('artwork_id')
            .eq('id', orderId)
            .single();

          if (orderData?.artwork_id) {
            const { data: artworkData } = await supabase
              .from('artworks')
              .select('title')
              .eq('id', orderData.artwork_id)
              .single();
            if (artworkData?.title) artworkTitle = artworkData.title;
          }

          try {
            await sendFirstSaleActivation({
              email: artistProfile.email,
              artistName: artistProfile.full_name || '',
              artworkTitle,
              saleAmount: order.total_amount_aud ?? 0,
              payoutAmount: payoutAmountAud,
            });
          } catch (err) {
            console.warn('[EMAIL_FAILED]', {
              type: 'first_sale_activation',
              artistId: order.artist_id,
              recipient: artistProfile.email,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        if (updateError) {
          console.error(`[Escrow] Failed to update subscription status for artist ${order.artist_id}:`, updateError);
        }
      }
    } catch (err) {
      // First sale detection must never block the payout flow
      console.error(`[Escrow] First sale detection error for artist ${order.artist_id}:`, err);
    }

    return { success: true, transferId: transfer.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown transfer error';
    console.error(`[Escrow] Transfer failed for order ${orderId}:`, message);
    await sendOpsAlert({
      title: 'Stripe transfer failed',
      description:
        `Escrow release to the artist's Connect account failed for order ${orderId}. ` +
        `The cron will retry; if the failure is permanent (e.g. restricted or deauthorized ` +
        `account) this alert will repeat each cron run until the order is cleared.`,
      context: {
        order_id: orderId,
        artist_id: order.artist_id,
        stripe_account_id: connectAccountId,
        payout_aud: payoutAmountAud,
        error: message,
      },
      level: 'error',
    });
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
    const refund = await stripe.refunds.create(
      {
        payment_intent: order.stripe_payment_intent_id,
        metadata: {
          signo_order_id: orderId,
        },
      },
      {
        idempotencyKey: `refund_order_${orderId}`,
      }
    );

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
        try {
          await sendPayoutReleased({
            artistEmail: artistResult.data.email,
            artistName: artistResult.data.full_name || '',
            orderId: order.id,
            artworkTitle: artworkResult.data?.title || 'Artwork',
            payoutAmount: order.artist_payout_aud || 0,
          });
        } catch (err) {
          console.warn('[EMAIL_FAILED]', {
            type: 'payout_released_auto',
            orderId: order.id,
            recipient: artistResult.data.email,
            error: err instanceof Error ? err.message : String(err),
          });
        }
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
    .select('id, artwork_id, buyer_id')
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

      // Send cancellation email to buyer (fire-and-forget)
      const [buyerResult, artworkResult] = await Promise.all([
        supabase.from('profiles').select('email, full_name').eq('id', order.buyer_id).single(),
        supabase.from('artworks').select('title').eq('id', order.artwork_id).single(),
      ]);

      if (buyerResult.data?.email) {
        try {
          await sendOrderCancelled({
            buyerEmail: buyerResult.data.email,
            buyerName: buyerResult.data.full_name || '',
            orderId: order.id,
            artworkTitle: artworkResult.data?.title || 'Artwork',
            reason: 'The artwork was not shipped within the required timeframe.',
          });
        } catch (err) {
          console.warn('[EMAIL_FAILED]', {
            type: 'order_cancelled_unshipped',
            orderId: order.id,
            recipient: buyerResult.data.email,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
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
