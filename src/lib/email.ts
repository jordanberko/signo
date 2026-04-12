import { Resend } from 'resend';

// ── Resend client (lazy-init to avoid errors when key is missing) ──

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    resend = new Resend(key);
  }
  return resend;
}

// ── Config ──

/**
 * From address.
 * Set RESEND_FROM_ADDRESS=Signo <noreply@signoart.com.au> once the domain is verified in Resend.
 * Falls back to Resend's sandbox address for development/testing.
 */
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'Signo <onboarding@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://signo-tau.vercel.app';

// ── HTML Escaping ──

/** Escape user-supplied strings before interpolating into HTML templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Shared HTML Template ──

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Signo</title>
</head>
<body style="margin:0;padding:0;background-color:#faf8f4;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f4;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${APP_URL}" style="text-decoration:none;">
                <span style="font-family:'EB Garamond',Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;color:#1a1a1a;letter-spacing:0.08em;">SIGNO</span><span style="font-family:'EB Garamond',Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;color:#6b7c4e;font-style:italic;">.</span>
              </a>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;padding:40px 36px;border:1px solid #e8e6e1;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;padding-bottom:16px;">
              <p style="font-size:12px;color:#7a7a72;margin:0 0 8px 0;line-height:1.6;">
                &copy; 2026 Signo. A curated marketplace for Australian artists.
              </p>
              <p style="font-size:11px;color:#a0a0a0;margin:0;">
                <!-- TODO: Build email preferences page and replace this placeholder -->
                <a href="${APP_URL}/settings" style="color:#6b7c4e;text-decoration:underline;">Email preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Shared Helpers ──

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px 0;">
    <tr>
      <td style="background-color:#6b7c4e;border-radius:50px;padding:14px 32px;">
        <a href="${url}" style="color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;display:inline-block;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e8e6e1;margin:24px 0;" />`;
}

// ── Safe Send Helper ──

/**
 * All email sends go through this wrapper.
 * Failures are logged but never thrown — email must never block business logic.
 */
async function safeSend(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const r = getResend();
    const { data, error } = await r.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error('[Email] Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent "${params.subject}" to ${params.to} (id: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    console.error(`[Email] Failed to send "${params.subject}" to ${params.to}:`, message);
    return { success: false, error: message };
  }
}

// ════════════════════════════════════════════════════════════════════
// 1. ORDER CONFIRMATION (to buyer)
// ════════════════════════════════════════════════════════════════════

export interface OrderConfirmationData {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  artworkTitle: string;
  artistName: string;
  artworkImageUrl?: string;
  totalAmount: number;
}

export async function sendOrderConfirmation(data: OrderConfirmationData) {
  const imageBlock = data.artworkImageUrl
    ? `<img src="${data.artworkImageUrl}" alt="${escapeHtml(data.artworkTitle)}" style="width:100%;max-width:480px;border-radius:12px;margin-bottom:24px;display:block;" />`
    : '';

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Order confirmed</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Thank you for your purchase, ${escapeHtml(data.buyerName || 'there')}. Here are the details.
    </p>

    ${imageBlock}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1a1a1a;line-height:1.8;">
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Artwork</td><td style="font-weight:500;">${escapeHtml(data.artworkTitle)}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Artist</td><td>${escapeHtml(data.artistName)}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Total paid</td><td style="font-weight:600;">${formatCurrency(data.totalAmount)}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Order ID</td><td style="font-family:monospace;font-size:12px;">${escapeHtml(data.orderId)}</td></tr>
    </table>

    ${divider()}

    <p style="font-size:13px;color:#7a7a72;margin:0;line-height:1.6;">
      Your payment is held securely until delivery is confirmed. The artist will ship your artwork within 7 days. You'll receive a tracking notification once it's on its way.
    </p>

    ${ctaButton('View Order', `${APP_URL}/orders/${data.orderId}`)}
  `);

  return safeSend({
    to: data.buyerEmail,
    subject: `Order confirmed — ${escapeHtml(data.artworkTitle)}`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 2. NEW SALE NOTIFICATION (to artist)
// ════════════════════════════════════════════════════════════════════

export interface NewSaleData {
  artistEmail: string;
  artistName: string;
  orderId: string;
  artworkTitle: string;
  salePrice: number;
  artistPayout: number;
  buyerCity?: string;
  buyerState?: string;
}

export async function sendNewSaleNotification(data: NewSaleData) {
  const locationLine = data.buyerCity || data.buyerState
    ? `<tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Ships to</td><td>${[data.buyerCity, data.buyerState].filter((s): s is string => Boolean(s)).map(escapeHtml).join(', ')}</td></tr>`
    : '';

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">You made a sale!</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Congratulations, ${escapeHtml(data.artistName || 'there')}. Your artwork has been purchased.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1a1a1a;line-height:1.8;">
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Artwork</td><td style="font-weight:500;">${escapeHtml(data.artworkTitle)}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Sale price</td><td style="font-weight:600;">${formatCurrency(data.salePrice)}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Your payout</td><td style="font-weight:600;color:#6b7c4e;">${formatCurrency(data.artistPayout)}</td></tr>
      ${locationLine}
    </table>

    ${divider()}

    <p style="font-size:13px;color:#1a1a1a;margin:0 0 4px 0;font-weight:600;">What to do next</p>
    <p style="font-size:13px;color:#7a7a72;margin:0;line-height:1.6;">
      Package the artwork carefully and ship it within <strong style="color:#1a1a1a;">7 days</strong>. Once shipped, update the order with the tracking number so the buyer can follow along.
    </p>

    ${ctaButton('View Order & Ship', `${APP_URL}/artist/orders`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `New sale — "${escapeHtml(data.artworkTitle)}"`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 3. ARTWORK APPROVED (to artist)
// ════════════════════════════════════════════════════════════════════

export interface ArtworkApprovedData {
  artistEmail: string;
  artistName: string;
  artworkId: string;
  artworkTitle: string;
}

export async function sendArtworkApproved(data: ArtworkApprovedData) {
  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Your artwork is live</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Great news, ${escapeHtml(data.artistName || 'there')}. Your artwork "<strong style="color:#1a1a1a;">${escapeHtml(data.artworkTitle)}</strong>" has been reviewed and approved. It's now visible to collectors on Signo.
    </p>

    ${ctaButton('View Your Artwork', `${APP_URL}/artwork/${data.artworkId}`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `Approved — "${escapeHtml(data.artworkTitle)}" is now live on Signo`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 3b. ARTWORK REJECTED (to artist)
// ════════════════════════════════════════════════════════════════════

export interface ArtworkRejectedData {
  artistEmail: string;
  artistName: string;
  artworkTitle: string;
  reviewNotes?: string;
}

export async function sendArtworkRejected(data: ArtworkRejectedData) {
  const notesBlock = data.reviewNotes
    ? `<div style="background-color:#faf8f4;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="font-size:12px;color:#7a7a72;margin:0 0 4px 0;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Review Notes</p>
        <p style="font-size:14px;color:#1a1a1a;margin:0;line-height:1.6;">${escapeHtml(data.reviewNotes)}</p>
      </div>`
    : '';

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Artwork needs changes</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 16px 0;line-height:1.6;">
      Hi ${escapeHtml(data.artistName || 'there')}, your artwork "<strong style="color:#1a1a1a;">${escapeHtml(data.artworkTitle)}</strong>" wasn't approved this time. Please review the notes below and re-submit when ready.
    </p>

    ${notesBlock}

    ${ctaButton('Go to Dashboard', `${APP_URL}/artist/dashboard`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `Update needed — "${escapeHtml(data.artworkTitle)}"`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 4. SHIPPING CONFIRMATION (to buyer)
// ════════════════════════════════════════════════════════════════════

export interface ShippingConfirmationData {
  buyerEmail: string;
  buyerName: string;
  orderId: string;
  artworkTitle: string;
  trackingNumber?: string;
  carrier?: string;
}

export async function sendShippingConfirmation(data: ShippingConfirmationData) {
  const trackingBlock = data.trackingNumber
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1a1a1a;line-height:1.8;margin-top:16px;">
        <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Carrier</td><td>${escapeHtml(data.carrier || 'Not specified')}</td></tr>
        <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Tracking</td><td style="font-family:monospace;font-size:13px;font-weight:500;">${escapeHtml(data.trackingNumber)}</td></tr>
      </table>`
    : '';

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Your artwork is on its way</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 16px 0;line-height:1.6;">
      Hi ${escapeHtml(data.buyerName || 'there')}, "<strong style="color:#1a1a1a;">${escapeHtml(data.artworkTitle)}</strong>" has been shipped.
    </p>

    ${trackingBlock}

    ${divider()}

    <p style="font-size:13px;color:#7a7a72;margin:0;line-height:1.6;">
      Once it arrives, you'll have a <strong style="color:#1a1a1a;">48-hour inspection window</strong> to confirm everything looks perfect. After that, payment is released to the artist.
    </p>

    ${ctaButton('Track Order', `${APP_URL}/orders/${data.orderId}`)}
  `);

  return safeSend({
    to: data.buyerEmail,
    subject: `Shipped — "${escapeHtml(data.artworkTitle)}" is on its way`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 5. DELIVERY CONFIRMED / PAYOUT RELEASED (to artist)
// ════════════════════════════════════════════════════════════════════

export interface PayoutReleasedData {
  artistEmail: string;
  artistName: string;
  orderId: string;
  artworkTitle: string;
  payoutAmount: number;
}

export async function sendPayoutReleased(data: PayoutReleasedData) {
  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Payment released</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Hi ${escapeHtml(data.artistName || 'there')}, the buyer has confirmed receipt of "<strong style="color:#1a1a1a;">${escapeHtml(data.artworkTitle)}</strong>".
    </p>

    <div style="background-color:#f0f4eb;border-radius:12px;padding:24px;text-align:center;margin-bottom:16px;">
      <p style="font-size:12px;color:#6b7c4e;margin:0 0 4px 0;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Payout amount</p>
      <p style="font-size:32px;font-weight:700;color:#1a1a1a;margin:0;">${formatCurrency(data.payoutAmount)}</p>
      <p style="font-size:12px;color:#7a7a72;margin:8px 0 0 0;">Transferred to your connected Stripe account</p>
    </div>

    ${ctaButton('View Earnings', `${APP_URL}/artist/earnings`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `Payment released — ${formatCurrency(data.payoutAmount)} for "${escapeHtml(data.artworkTitle)}"`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 6. ORDER CANCELLED / REFUND (to buyer)
// ════════════════════════════════════════════════════════════════════

export interface OrderCancelledData {
  buyerEmail: string;
  buyerName: string;
  artworkTitle: string;
  orderId: string;
  reason: string;
}

export async function sendOrderCancelled(data: OrderCancelledData) {
  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Order cancelled</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Hi ${escapeHtml(data.buyerName || 'there')}, your order for "<strong style="color:#1a1a1a;">${escapeHtml(data.artworkTitle)}</strong>" has been cancelled. A full refund has been issued to your original payment method. Refunds typically appear within 5–10 business days.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1a1a1a;line-height:1.8;">
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Order ID</td><td style="font-family:monospace;font-size:12px;">${escapeHtml(data.orderId)}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Reason</td><td>${escapeHtml(data.reason)}</td></tr>
    </table>

    ${divider()}

    <p style="font-size:13px;color:#7a7a72;margin:0;line-height:1.6;">
      If you have any questions, please reply to this email and we'll be happy to help.
    </p>

    ${ctaButton('Browse Artwork', `${APP_URL}/browse`)}
  `);

  return safeSend({
    to: data.buyerEmail,
    subject: `Order cancelled — ${escapeHtml(data.artworkTitle)}`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 7. WELCOME EMAIL (to new users)
// ════════════════════════════════════════════════════════════════════

export interface WelcomeEmailData {
  email: string;
  name: string;
  role: 'buyer' | 'artist';
}

export async function sendWelcomeEmail(data: WelcomeEmailData) {
  const isArtist = data.role === 'artist';

  const artistBlock = isArtist
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
        <tr>
          <td style="background-color:#faf8f4;border-radius:8px;padding:16px;">
            <p style="font-size:13px;color:#1a1a1a;margin:0 0 4px 0;font-weight:600;">Ready to sell?</p>
            <p style="font-size:13px;color:#7a7a72;margin:0;line-height:1.6;">
              Complete your artist onboarding to upload your first artwork. Your account is completely free until your first sale. After that, it's just $30/month — zero commission.
            </p>
          </td>
        </tr>
      </table>`
    : '';

  const ctaText = isArtist ? 'Start Onboarding' : 'Browse Artwork';
  const ctaUrl = isArtist ? `${APP_URL}/artist/onboarding` : `${APP_URL}/browse`;

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Welcome to Signo</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 20px 0;line-height:1.6;">
      Hi ${escapeHtml(data.name || 'there')}, thanks for joining. Signo is a curated marketplace for Australian artists — where quality matters and creativity thrives.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#7a7a72;line-height:1.8;">
      <tr>
        <td style="padding:4px 0;"><span style="color:#6b7c4e;font-weight:600;">&#10003;</span>&nbsp;&nbsp;Every piece is reviewed for quality</td>
      </tr>
      <tr>
        <td style="padding:4px 0;"><span style="color:#6b7c4e;font-weight:600;">&#10003;</span>&nbsp;&nbsp;Secure checkout with buyer protection</td>
      </tr>
      <tr>
        <td style="padding:4px 0;"><span style="color:#6b7c4e;font-weight:600;">&#10003;</span>&nbsp;&nbsp;Artists keep 100% — zero commission</td>
      </tr>
    </table>

    ${artistBlock}

    ${ctaButton(ctaText, ctaUrl)}
  `);

  return safeSend({
    to: data.email,
    subject: `Welcome to Signo${isArtist ? ' — let\'s get your art online' : ''}`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 8. FIRST SALE ACTIVATION (to artist — subscription begins)
// ════════════════════════════════════════════════════════════════════

export interface FirstSaleActivationData {
  email: string;
  artistName: string;
  artworkTitle: string;
  saleAmount: number;
  payoutAmount: number;
}

export async function sendFirstSaleActivation(data: FirstSaleActivationData) {
  const firstName = (data.artistName || 'there').split(' ')[0];

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:500;color:#1a1a1a;margin:0 0 24px 0;text-align:center;">Your first sale is complete!</h1>

    <p style="font-size:15px;color:#1a1a1a;margin:0 0 16px 0;line-height:1.7;">
      Hey ${escapeHtml(firstName)},
    </p>

    <p style="font-size:15px;color:#1a1a1a;margin:0 0 24px 0;line-height:1.7;">
      You just sold <strong>${escapeHtml(data.artworkTitle)}</strong> for ${formatCurrency(data.saleAmount)}! The funds are on their way to your bank account. This is a big moment &mdash; congratulations.
    </p>

    <p style="font-size:15px;color:#1a1a1a;margin:0 0 28px 0;line-height:1.7;">
      Because you&rsquo;ve been listing for free on Signo, your $30/month subscription will now begin. If you don&rsquo;t add a payment method within 14 days, your listings will be automatically paused &mdash; not deleted. You can reactivate anytime.
    </p>

    ${ctaButton('Add Payment Method', `${APP_URL}/artist/subscribe`)}

    <!-- What happens next box -->
    <div style="background-color:#faf8f4;border:1px solid #e8e6e1;border-radius:12px;padding:24px;margin:28px 0 0 0;">
      <p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0 0 16px 0;">What happens next:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;color:#4a4a4a;line-height:2;">
        <tr><td style="padding-right:10px;vertical-align:top;color:#6b7c4e;">&#10003;</td><td>Your artwork stays on Signo (nothing is deleted)</td></tr>
        <tr><td style="padding-right:10px;vertical-align:top;color:#6b7c4e;">&#10003;</td><td>You keep 100% of this sale minus Stripe fees</td></tr>
        <tr><td style="padding-right:10px;vertical-align:top;color:#6b7c4e;">&#10003;</td><td>$30/month subscription begins when you add payment</td></tr>
        <tr><td style="padding-right:10px;vertical-align:top;color:#6b7c4e;">&#10003;</td><td>Cancel anytime &mdash; your listings just get paused</td></tr>
        <tr><td style="padding-right:10px;vertical-align:top;color:#b08d3e;">&#9203;</td><td>14 days to add a payment method before listings pause</td></tr>
      </table>
    </div>

    ${divider()}

    <p style="font-size:14px;color:#7a7a72;margin:0 0 4px 0;line-height:1.6;">
      Thanks for being part of Signo. We&rsquo;re excited to see what you create next.
    </p>
    <p style="font-size:14px;color:#7a7a72;margin:0;line-height:1.6;">
      &mdash; The Signo Team
    </p>
  `);

  return safeSend({
    to: data.email,
    subject: 'Congratulations on your first sale! \u{1F389}',
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 9. LISTINGS PAUSED (to artist — grace period expired)
// ════════════════════════════════════════════════════════════════════

export interface ListingsPausedData {
  email: string;
  artistName: string;
}

export async function sendListingsPaused(data: ListingsPausedData) {
  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Your Signo listings have been paused</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Hi ${escapeHtml(data.artistName || 'there')}, your 14-day grace period has ended. Your listings are hidden from buyers until you add a payment method.
    </p>

    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Your artworks haven't been deleted — they'll go live again as soon as you subscribe.
    </p>

    ${ctaButton('Reactivate Your Listings', `${APP_URL}/artist/subscribe`)}
  `);

  return safeSend({
    to: data.email,
    subject: 'Your Signo listings have been paused',
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 10. GRACE PERIOD REMINDER (to artist — approaching deadline)
// ════════════════════════════════════════════════════════════════════

export interface GracePeriodReminderData {
  email: string;
  artistName: string;
  daysRemaining: number;
}

export async function sendGracePeriodReminder(data: GracePeriodReminderData) {
  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Friendly reminder</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Hi ${escapeHtml(data.artistName || 'there')}, you have <strong style="color:#1a1a1a;">${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'}</strong> left to add a payment method for your Signo subscription.
    </p>

    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      If you don't add a payment method before the deadline, your listings will be paused and hidden from buyers. Don't worry — your artworks won't be deleted and you can reactivate anytime.
    </p>

    ${ctaButton('Add Payment Method', `${APP_URL}/artist/subscribe`)}
  `);

  return safeSend({
    to: data.email,
    subject: `Reminder: Add your payment method \u2014 ${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'} left`,
    html,
  });
}
