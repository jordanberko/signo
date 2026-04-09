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
    ? `<img src="${data.artworkImageUrl}" alt="${data.artworkTitle}" style="width:100%;max-width:480px;border-radius:12px;margin-bottom:24px;display:block;" />`
    : '';

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Order confirmed</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Thank you for your purchase, ${data.buyerName || 'there'}. Here are the details.
    </p>

    ${imageBlock}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1a1a1a;line-height:1.8;">
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Artwork</td><td style="font-weight:500;">${data.artworkTitle}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Artist</td><td>${data.artistName}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Total paid</td><td style="font-weight:600;">${formatCurrency(data.totalAmount)}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Order ID</td><td style="font-family:monospace;font-size:12px;">${data.orderId}</td></tr>
    </table>

    ${divider()}

    <p style="font-size:13px;color:#7a7a72;margin:0;line-height:1.6;">
      Your payment is held securely until delivery is confirmed. The artist will ship your artwork within 5 business days. You'll receive a tracking notification once it's on its way.
    </p>

    ${ctaButton('View Order', `${APP_URL}/orders/${data.orderId}`)}
  `);

  return safeSend({
    to: data.buyerEmail,
    subject: `Order confirmed — ${data.artworkTitle}`,
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
    ? `<tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Ships to</td><td>${[data.buyerCity, data.buyerState].filter(Boolean).join(', ')}</td></tr>`
    : '';

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">You made a sale!</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 24px 0;line-height:1.6;">
      Congratulations, ${data.artistName || 'there'}. Your artwork has been purchased.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1a1a1a;line-height:1.8;">
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Artwork</td><td style="font-weight:500;">${data.artworkTitle}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Sale price</td><td style="font-weight:600;">${formatCurrency(data.salePrice)}</td></tr>
      <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Your payout</td><td style="font-weight:600;color:#6b7c4e;">${formatCurrency(data.artistPayout)}</td></tr>
      ${locationLine}
    </table>

    ${divider()}

    <p style="font-size:13px;color:#1a1a1a;margin:0 0 4px 0;font-weight:600;">What to do next</p>
    <p style="font-size:13px;color:#7a7a72;margin:0;line-height:1.6;">
      Package the artwork carefully and ship it within <strong style="color:#1a1a1a;">5 business days</strong>. Once shipped, update the order with the tracking number so the buyer can follow along.
    </p>

    ${ctaButton('View Order & Ship', `${APP_URL}/artist/orders`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `New sale — "${data.artworkTitle}"`,
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
      Great news, ${data.artistName || 'there'}. Your artwork "<strong style="color:#1a1a1a;">${data.artworkTitle}</strong>" has been reviewed and approved. It's now visible to collectors on Signo.
    </p>

    ${ctaButton('View Your Artwork', `${APP_URL}/artwork/${data.artworkId}`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `Approved — "${data.artworkTitle}" is now live on Signo`,
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
        <p style="font-size:14px;color:#1a1a1a;margin:0;line-height:1.6;">${data.reviewNotes}</p>
      </div>`
    : '';

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Artwork needs changes</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 16px 0;line-height:1.6;">
      Hi ${data.artistName || 'there'}, your artwork "<strong style="color:#1a1a1a;">${data.artworkTitle}</strong>" wasn't approved this time. Please review the notes below and re-submit when ready.
    </p>

    ${notesBlock}

    ${ctaButton('Go to Dashboard', `${APP_URL}/artist/dashboard`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `Update needed — "${data.artworkTitle}"`,
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
        <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Carrier</td><td>${data.carrier || 'Not specified'}</td></tr>
        <tr><td style="color:#7a7a72;padding-right:12px;white-space:nowrap;">Tracking</td><td style="font-family:monospace;font-size:13px;font-weight:500;">${data.trackingNumber}</td></tr>
      </table>`
    : '';

  const html = emailWrapper(`
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500;color:#1a1a1a;margin:0 0 8px 0;">Your artwork is on its way</h1>
    <p style="font-size:14px;color:#7a7a72;margin:0 0 16px 0;line-height:1.6;">
      Hi ${data.buyerName || 'there'}, "<strong style="color:#1a1a1a;">${data.artworkTitle}</strong>" has been shipped.
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
    subject: `Shipped — "${data.artworkTitle}" is on its way`,
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
      Hi ${data.artistName || 'there'}, the buyer has confirmed receipt of "<strong style="color:#1a1a1a;">${data.artworkTitle}</strong>".
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
    subject: `Payment released — ${formatCurrency(data.payoutAmount)} for "${data.artworkTitle}"`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 6. WELCOME EMAIL (to new users)
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
              Complete your artist onboarding to upload your first artwork. Signo charges a flat $30/month — you keep 100% of every sale.
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
      Hi ${data.name || 'there'}, thanks for joining. Signo is a curated marketplace for Australian artists — where quality matters and creativity thrives.
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
