import { getStripe } from './config';
import { createTransfer } from './connect';
import { createClient } from '@supabase/supabase-js';
import { sendPayoutReleased, sendOrderCancelled, sendFirstSaleActivation } from '@/lib/email';
import { sendOpsAlert } from '@/lib/ops-alert';
import type { OrderStatus } from '@/lib/types/database';

// Service role client — bypasses RLS for server-side operations
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

    // ── Record the payout ──
    // The money has already moved. If this write is lost, the order stays
    // 'delivered' with a null payout_released_at, so the auto-release cron
    // picks it up again on the next run. Stripe's idempotency key only
    // dedupes for 24 hours — past that window a retry creates a SECOND
    // transfer and the artist is paid twice. So this write is checked, and
    // a failure is a page-ops-now event rather than a swallowed error.
    const { data: settled, error: settleError } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        payout_released_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .is('payout_released_at', null)
      .select('id');

    if (settleError || !settled || settled.length === 0) {
      // Zero rows can also mean a concurrent runner recorded the payout
      // first, which is harmless. Re-read to tell the two cases apart.
      const { data: recheck } = await supabase
        .from('orders')
        .select('status, payout_released_at')
        .eq('id', orderId)
        .maybeSingle();

      if (recheck?.payout_released_at) {
        console.log(
          `[Escrow] Payout for order ${orderId} was recorded concurrently at ${recheck.payout_released_at}`
        );
      } else {
        console.error(
          `[Escrow] PAYOUT SENT BUT NOT RECORDED for order ${orderId}:`,
          settleError ?? 'no rows updated'
        );
        await sendOpsAlert({
          title: 'PAYOUT SENT BUT ORDER NOT MARKED COMPLETE',
          description:
            `Transfer ${transfer.id} succeeded for order ${orderId} but the order row could not be ` +
            `updated, so it still looks unpaid. The auto-release cron will try to release it again. ` +
            `Stripe's idempotency key blocks a duplicate transfer for 24 hours only — if this is not ` +
            `fixed within 24 hours the artist will be paid TWICE. Set status='completed' and ` +
            `payout_released_at on this order by hand now.`,
          context: {
            order_id: orderId,
            transfer_id: transfer.id,
            artist_id: order.artist_id,
            payout_aud: payoutAmountAud,
            error: settleError?.message ?? 'no rows updated',
          },
          level: 'error',
        });
      }
    }

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

// Statuses that mean the order is already settled — refunding again would
// either double-refund or contradict a completed payout.
const TERMINAL_STATUSES = ['refunded', 'completed', 'cancelled'];

// Default set of statuses a refund may be issued from.
const REFUNDABLE_STATUSES: OrderStatus[] = [
  'paid',
  'shipped',
  'delivered',
  'disputed',
  'return_pending',
  'return_in_transit',
];

export interface RefundOptions {
  /** Status to write on success. Default 'refunded'. */
  finalStatus?: Extract<OrderStatus, 'refunded' | 'cancelled'>;
  /**
   * Statuses this refund is allowed to act on. Narrow it when the caller
   * only means to refund a specific stage — e.g. the unshipped-order cron
   * passes ['paid'] so an order the artist shipped seconds ago is skipped
   * instead of refunded out from under them.
   */
  fromStatuses?: OrderStatus[];
}

/**
 * Refund the buyer's payment for an order.
 * Uses the original payment intent to issue a full refund.
 *
 * The status change is claimed BEFORE the Stripe call, filtered on
 * `fromStatuses`, so two concurrent callers (or a cron racing a human
 * action) cannot both reach `refunds.create`. If Stripe then fails, the
 * claim is rolled back to the status we found.
 *
 * Refuses outright once `payout_released_at` is set: the artist already has
 * the money, so refunding the buyer would come out of Signo's balance. That
 * needs a transfer reversal first, which is a deliberate ops decision.
 */
export async function refundBuyer(
  orderId: string,
  options: RefundOptions = {}
): Promise<{
  success: boolean;
  refundId?: string;
  error?: string;
}> {
  const finalStatus = options.finalStatus ?? 'refunded';
  const fromStatuses = options.fromStatuses ?? REFUNDABLE_STATUSES;
  const supabase = getServiceClient();

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, stripe_payment_intent_id, status, payout_released_at, artist_id, total_amount_aud'
    )
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
  if (TERMINAL_STATUSES.includes(order.status)) {
    return {
      success: false,
      error: `Order ${orderId} is already ${order.status}`,
    };
  }

  // Payout guard — the artist has been paid, so a refund here would be
  // funded by Signo. Requires reversing the transfer first.
  if (order.payout_released_at) {
    console.error(
      `[Escrow] Refund blocked for order ${orderId}: payout already released at ${order.payout_released_at}`
    );
    await sendOpsAlert({
      title: 'Refund blocked — artist has already been paid',
      description:
        `A refund was attempted on order ${orderId}, but the escrow payout was released at ` +
        `${order.payout_released_at}. Refunding now would take the money from Signo's balance, not ` +
        `the artist's. To proceed: reverse the transfer on the Connect account in Stripe, clear ` +
        `payout_released_at, then re-run the refund. No refund has been issued.`,
      context: {
        order_id: orderId,
        artist_id: order.artist_id,
        amount_aud: order.total_amount_aud,
        payment_intent: order.stripe_payment_intent_id,
        payout_released_at: order.payout_released_at,
      },
      level: 'error',
    });
    return {
      success: false,
      error: `Order ${orderId} payout was already released at ${order.payout_released_at}; reverse the transfer before refunding`,
    };
  }

  if (!fromStatuses.includes(order.status)) {
    return {
      success: false,
      error: `Order ${orderId} is in status '${order.status}', which this refund is not allowed to act on`,
    };
  }

  // ── Atomic claim ──
  // Move the order to its final status first, filtered on the statuses we
  // are willing to act on. Losing this race means someone else changed the
  // order (artist shipped, admin resolved, another cron pass) — abort
  // rather than refund against a stale read.
  const { data: claimed, error: claimError } = await supabase
    .from('orders')
    .update({ status: finalStatus })
    .eq('id', orderId)
    .in('status', fromStatuses)
    .is('payout_released_at', null)
    .select('id');

  if (claimError) {
    return {
      success: false,
      error: `Failed to claim order ${orderId} for refund: ${claimError.message}`,
    };
  }

  if (!claimed || claimed.length === 0) {
    return {
      success: false,
      error: `Order ${orderId} changed state concurrently; refund not issued`,
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

    console.log(
      `[Escrow] Refunded order ${orderId} (refund: ${refund.id}, status: ${finalStatus})`
    );

    return { success: true, refundId: refund.id };
  } catch (err) {
    // Stripe refused — release the claim so the order isn't stranded in a
    // refunded/cancelled state with the buyer's money still taken.
    const { error: revertError } = await supabase
      .from('orders')
      .update({ status: order.status })
      .eq('id', orderId)
      .eq('status', finalStatus);

    if (revertError) {
      console.error(
        `[Escrow] Failed to revert order ${orderId} to '${order.status}' after refund failure:`,
        revertError.message
      );
    }

    const message = err instanceof Error ? err.message : 'Unknown refund error';
    console.error(`[Escrow] Refund failed for order ${orderId}:`, message);
    await sendOpsAlert({
      title: `Refund failed for order ${orderId}`,
      description:
        `Stripe refunds.create threw for order ${orderId}. Buyer is expecting funds back; this requires manual intervention via the Stripe dashboard or a re-attempt of refundBuyer once the underlying issue is fixed.`,
      context: {
        order_id: orderId,
        payment_intent: order.stripe_payment_intent_id,
        error: message,
      },
      level: 'error',
    });
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
      // A delivered order past its inspection window that cannot pay out is
      // stranded money — the buyer's funds sit on the platform and the
      // artist never receives them. releaseFunds already alerts on a Stripe
      // transfer throw, but NOT on the fail-fast guards (no Connect account,
      // invalid payout amount) which are exactly the states that never
      // resolve on their own. Alert per order so these surface instead of
      // being buried in a cron log line.
      await sendOpsAlert({
        title: 'Escrow release failed — payout stranded',
        description:
          `Order ${order.id} is delivered and past its inspection window but its payout could not ` +
          `be released. The buyer's money is held on the platform and the artist has not been paid. ` +
          `Most likely the artist has no working Stripe Connect account. The cron will retry each ` +
          `hour; if it keeps failing, resolve the artist's payout setup or refund the buyer.`,
        context: {
          order_id: order.id,
          artist_id: order.artist_id,
          artwork_id: order.artwork_id,
          payout_aud: order.artist_payout_aud ?? 0,
          error: result.error ?? 'unknown',
        },
        level: 'error',
      });
    }
  }

  console.log(
    `[Escrow Auto-Release] Complete: ${released} released, ${failed} failed`
  );

  return { released, failed, errors };
}

// ── Shipped → delivered backstop ──

/**
 * The inspection window (and therefore the artist payout) only starts once
 * an order reaches 'delivered', which normally requires the BUYER to click
 * "confirm delivery". Most buyers never do — the piece arrives and they move
 * on. Without a backstop the order sits at 'shipped' forever and the artist
 * is never paid, even though the work was delivered weeks ago.
 *
 * This marks any order that has been 'shipped' for longer than
 * SHIPPED_AUTODELIVER_DAYS as delivered, which starts the normal 48-hour
 * inspection clock. The buyer can still dispute during that window; only
 * after it passes does the release-escrow cron pay the artist. Net effect:
 * an artist is always paid ~SHIPPED_AUTODELIVER_DAYS + 2 after shipping,
 * even for a silent buyer.
 *
 * Idempotent and race-safe: the update is filtered on status='shipped', so a
 * buyer who confirms delivery (or opens a dispute) between the SELECT and the
 * UPDATE takes the row out of scope and this no-ops for it.
 */
const SHIPPED_AUTODELIVER_DAYS = 14;
const INSPECTION_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function autoMarkStaleShipmentsDelivered(): Promise<{
  delivered: number;
  errors: string[];
}> {
  const supabase = getServiceClient();

  const cutoff = new Date(
    Date.now() - SHIPPED_AUTODELIVER_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, artist_id, artwork_id, buyer_id')
    .eq('status', 'shipped')
    .lt('shipped_at', cutoff);

  if (error) {
    console.error('[Escrow Auto-Deliver] Query error:', error);
    return { delivered: 0, errors: [error.message] };
  }

  if (!orders || orders.length === 0) {
    return { delivered: 0, errors: [] };
  }

  console.log(
    `[Escrow Auto-Deliver] ${orders.length} order(s) shipped >${SHIPPED_AUTODELIVER_DAYS}d ago with no delivery confirmation`
  );

  let delivered = 0;
  const errors: string[] = [];
  const now = Date.now();

  for (const order of orders) {
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'delivered',
        delivered_at: new Date(now).toISOString(),
        inspection_deadline: new Date(now + INSPECTION_WINDOW_MS).toISOString(),
      })
      .eq('id', order.id)
      .eq('status', 'shipped')
      .select('id');

    if (updateError) {
      errors.push(`${order.id}: ${updateError.message}`);
      continue;
    }
    if (updated && updated.length > 0) delivered++;
  }

  if (delivered > 0) {
    console.log(`[Escrow Auto-Deliver] Auto-delivered ${delivered} order(s)`);
  }

  return { delivered, errors };
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
    // Refund the buyer and cancel in one atomic claim, restricted to
    // 'paid'. Without the restriction an artist who ships between this
    // cron's SELECT and its refund gets their sale cancelled after the
    // artwork has already left the studio.
    const result = await refundBuyer(order.id, {
      finalStatus: 'cancelled',
      fromStatuses: ['paid'],
    });

    if (result.success) {
      // Re-list the artwork. Filtered on 'sold' so a work the artist has
      // since withdrawn or relisted by hand isn't dragged back on sale.
      const { error: relistError } = await supabase
        .from('artworks')
        .update({ status: 'approved' })
        .eq('id', order.artwork_id)
        .eq('status', 'sold');

      if (relistError) {
        console.error(
          `[Cancel Unshipped] Failed to re-list artwork ${order.artwork_id}:`,
          relistError.message
        );
        await sendOpsAlert({
          title: 'Cancelled order but artwork not re-listed',
          description:
            `Order ${order.id} was refunded and cancelled, but its artwork could not be returned to ` +
            `'approved' — it stays invisible to buyers until set back by hand.`,
          context: {
            order_id: order.id,
            artwork_id: order.artwork_id,
            error: relistError.message,
          },
          level: 'error',
        });
      }

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
