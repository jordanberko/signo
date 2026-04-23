import { Resend } from 'resend';
import { appUrl } from '@/lib/urls';

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
const APP_URL = appUrl();

// ── Editorial palette (mirrors --color-* tokens in src/app/globals.css) ──

const INK = '#1a1a18';
const STONE = '#b8b2a4';
const STONE_DARK = '#8a8478';
const WARM_WHITE = '#fcfbf8';
const CREAM = '#f7f5f0';
const BORDER = '#e8e6e1'; // visual stand-in for rgba(26,26,24,0.08); email clients prefer solid hex
const TERRACOTTA = '#c45d3e';

// Email-safe font stacks
const SERIF = "Georgia, 'Times New Roman', 'Didot', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

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

/**
 * Editorial email wrapper.
 * — Warm-white ground, no rounded card.
 * — Serif wordmark "Signo." with italic full-stop.
 * — Hairline footer with tag-line and preferences link.
 */
function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Signo</title>
</head>
<body style="margin:0;padding:0;background-color:${WARM_WHITE};font-family:${SANS};color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${WARM_WHITE};">
    <tr>
      <td align="center" style="padding:56px 20px 48px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">

          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding-bottom:44px;">
              <a href="${APP_URL}" style="text-decoration:none;display:inline-block;">
                <span style="font-family:${SERIF};font-size:30px;font-weight:400;color:${INK};letter-spacing:0.04em;">Signo</span><span style="font-family:${SERIF};font-size:30px;font-weight:400;color:${INK};font-style:italic;">.</span>
              </a>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:0 4px;">
              ${content}
            </td>
          </tr>

          <!-- Footer hairline -->
          <tr>
            <td style="padding:48px 4px 0 4px;">
              <div style="border-top:1px solid ${BORDER};padding-top:24px;">
                <p style="font-family:${SERIF};font-size:13px;font-style:italic;color:${STONE};margin:0 0 10px 0;line-height:1.7;text-align:center;">
                  Signo &mdash; a curated room for Australian artists.
                </p>
                <p style="font-family:${SANS};font-size:10px;color:${STONE};margin:0;text-align:center;letter-spacing:0.18em;text-transform:uppercase;">
                  <a href="${APP_URL}" style="color:${STONE};text-decoration:none;">signoart.com.au</a>
                  &nbsp;&middot;&nbsp;
                  <a href="${APP_URL}/settings" style="color:${STONE};text-decoration:none;">Email preferences</a>
                </p>
              </div>
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

/**
 * Editorial CTA — ink-bordered rectangle with serif italic label and arrow.
 * Replaces the legacy sage-pill button.
 */
function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 8px 0;">
    <tr>
      <td style="border:1px solid ${INK};padding:16px 28px;">
        <a href="${url}" style="font-family:${SERIF};font-size:15px;font-style:italic;color:${INK};text-decoration:none;display:inline-block;letter-spacing:0.01em;">${text}&nbsp;&rarr;</a>
      </td>
    </tr>
  </table>`;
}

/** A secondary, text-only link in the editorial style. */
function textLink(text: string, url: string): string {
  return `<a href="${url}" style="font-family:${SERIF};font-size:14px;font-style:italic;color:${INK};text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;">${text}</a>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid ${BORDER};margin:32px 0;" />`;
}

/** Small uppercase kicker label ("ORDER CONFIRMED", "NEW SALE", etc.). */
function kicker(text: string): string {
  return `<p style="font-family:${SANS};font-size:10px;font-weight:400;color:${STONE};margin:0 0 20px 0;letter-spacing:0.22em;text-transform:uppercase;">${text}</p>`;
}

/** Large serif headline, optional italic accent portion. */
function headline(text: string, italicTail?: string): string {
  const tail = italicTail ? ` <em style="font-style:italic;">${italicTail}</em>` : '';
  return `<h1 style="font-family:${SERIF};font-size:34px;font-weight:400;color:${INK};margin:0 0 22px 0;line-height:1.15;letter-spacing:-0.01em;">${text}${tail}</h1>`;
}

/** Serif body paragraph, lighter weight for editorial feel. */
function lede(text: string): string {
  return `<p style="font-family:${SERIF};font-size:17px;font-weight:400;color:${STONE_DARK};margin:0 0 24px 0;line-height:1.6;">${text}</p>`;
}

/** Smaller sans body paragraph for secondary copy. */
function body(text: string, marginBottom = 20): string {
  return `<p style="font-family:${SANS};font-size:14px;color:${STONE_DARK};margin:0 0 ${marginBottom}px 0;line-height:1.7;">${text}</p>`;
}

/**
 * Hairline ledger row — kicker label, value. Used in place of rounded tables.
 * Pass an array of [label, value, valueStyle?] tuples.
 */
function ledger(rows: Array<[string, string, string?]>): string {
  const cells = rows
    .map(([label, value, extra]) => {
      const valueStyle = `font-family:${SERIF};font-size:15px;color:${INK};${extra || ''}`;
      return `<tr>
        <td style="padding:14px 0;border-top:1px solid ${BORDER};width:40%;font-family:${SANS};font-size:10px;color:${STONE};letter-spacing:0.22em;text-transform:uppercase;vertical-align:top;">${label}</td>
        <td style="padding:14px 0;border-top:1px solid ${BORDER};${valueStyle}">${value}</td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${BORDER};margin:8px 0 24px 0;">
    ${cells}
  </table>`;
}

/** Numbered list with serif italic index in its own left column. */
function numberedList(items: string[]): string {
  const rows = items
    .map((item, i) => {
      const n = String(i + 1).padStart(2, '0');
      return `<tr>
        <td style="padding:12px 0;border-top:1px solid ${BORDER};width:44px;font-family:${SERIF};font-size:14px;font-style:italic;color:${STONE};vertical-align:top;">${n}</td>
        <td style="padding:12px 0;border-top:1px solid ${BORDER};font-family:${SERIF};font-size:15px;color:${INK};line-height:1.6;vertical-align:top;">${item}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid ${BORDER};margin:8px 0 24px 0;">${rows}</table>`;
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
    ? `<div style="margin:4px 0 32px 0;background-color:${CREAM};">
        <img src="${data.artworkImageUrl}" alt="${escapeHtml(data.artworkTitle)}" style="width:100%;max-width:552px;display:block;border:0;" />
      </div>`
    : '';

  const html = emailWrapper(`
    ${kicker('Order confirmed')}
    ${headline('Thank you,', escapeHtml(data.buyerName || 'friend') + '.')}
    ${lede(`Your order for &ldquo;${escapeHtml(data.artworkTitle)}&rdquo; by ${escapeHtml(data.artistName)} has been received. Payment is held securely until delivery is confirmed.`)}

    ${imageBlock}

    ${ledger([
      ['Artwork', escapeHtml(data.artworkTitle), 'font-style:italic;'],
      ['Artist', escapeHtml(data.artistName)],
      ['Total paid', formatCurrency(data.totalAmount)],
      ['Order', `<span style="font-family:${SANS};font-size:11px;color:${STONE};letter-spacing:0.08em;">${escapeHtml(data.orderId)}</span>`],
    ])}

    ${body('The artist will dispatch your artwork within seven days. A tracking notification will follow once it leaves the studio.')}

    ${ctaButton('View order', `${APP_URL}/orders/${data.orderId}`)}
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
  const location = [data.buyerCity, data.buyerState].filter((s): s is string => Boolean(s)).join(', ');
  const rows: Array<[string, string, string?]> = [
    ['Artwork', escapeHtml(data.artworkTitle), 'font-style:italic;'],
    ['Sale price', formatCurrency(data.salePrice)],
    ['Your payout', formatCurrency(data.artistPayout), 'font-weight:500;'],
  ];
  if (location) rows.push(['Ships to', escapeHtml(location)]);

  const html = emailWrapper(`
    ${kicker('A new sale')}
    ${headline('A work has found', 'its home.')}
    ${lede(`Congratulations, ${escapeHtml(data.artistName || 'there')}. A collector has just bought your piece.`)}

    ${ledger(rows)}

    ${divider()}

    <p style="font-family:${SERIF};font-size:15px;color:${INK};margin:0 0 8px 0;font-style:italic;">&mdash; What to do next</p>
    ${body('Package the work with care and dispatch within seven days. Once it ships, add the tracking number to the order so the buyer can follow along.')}

    ${ctaButton('Open the order', `${APP_URL}/artist/orders`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `A new sale — "${escapeHtml(data.artworkTitle)}"`,
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
    ${kicker('Approved')}
    ${headline('Your work is', 'on the wall.')}
    ${lede(`${escapeHtml(data.artistName || 'Hello')}, &ldquo;${escapeHtml(data.artworkTitle)}&rdquo; has been reviewed and approved. It is now live on Signo and visible to collectors.`)}

    ${ctaButton('View your listing', `${APP_URL}/artwork/${data.artworkId}`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `Approved — "${escapeHtml(data.artworkTitle)}" is now live`,
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
    ? `<div style="border-top:1px solid ${TERRACOTTA};border-bottom:1px solid ${TERRACOTTA};padding:20px 0;margin:24px 0;">
        <p style="font-family:${SANS};font-size:10px;color:${TERRACOTTA};margin:0 0 10px 0;letter-spacing:0.22em;text-transform:uppercase;">&mdash; Editor&rsquo;s note</p>
        <p style="font-family:${SERIF};font-size:16px;font-style:italic;color:${INK};margin:0;line-height:1.6;">&ldquo;${escapeHtml(data.reviewNotes)}&rdquo;</p>
      </div>`
    : '';

  const html = emailWrapper(`
    ${kicker('Needs changes')}
    ${headline('A note from', 'the editor.')}
    ${lede(`Hello ${escapeHtml(data.artistName || 'there')}, &ldquo;${escapeHtml(data.artworkTitle)}&rdquo; hasn&rsquo;t been approved this time. Read the notes below, make your changes, and resubmit when you&rsquo;re ready.`)}

    ${notesBlock}

    ${body('When you save the revised work, it will automatically return to the review queue. No new submission needed.')}

    ${ctaButton('Revise the work', `${APP_URL}/artist/artworks`)}
  `);

  return safeSend({
    to: data.artistEmail,
    subject: `Revisions requested — "${escapeHtml(data.artworkTitle)}"`,
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
  const rows: Array<[string, string, string?]> = [
    ['Artwork', escapeHtml(data.artworkTitle), 'font-style:italic;'],
  ];
  if (data.carrier) rows.push(['Carrier', escapeHtml(data.carrier)]);
  if (data.trackingNumber) rows.push(['Tracking', `<span style="font-family:${SANS};font-size:12px;color:${INK};letter-spacing:0.06em;">${escapeHtml(data.trackingNumber)}</span>`]);

  const html = emailWrapper(`
    ${kicker('Shipped')}
    ${headline('Your work is', 'on its way.')}
    ${lede(`${escapeHtml(data.buyerName || 'Hello')}, &ldquo;${escapeHtml(data.artworkTitle)}&rdquo; has left the studio and is heading to you.`)}

    ${ledger(rows)}

    ${divider()}

    ${body('Once the work arrives you&rsquo;ll have a forty-eight hour window to inspect it. After that, payment is released to the artist.')}

    ${ctaButton('Track the order', `${APP_URL}/orders/${data.orderId}`)}
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
    ${kicker('Payment released')}
    ${headline('The work arrived.', 'Payment is yours.')}
    ${lede(`Hello ${escapeHtml(data.artistName || 'there')}, the buyer has confirmed receipt of &ldquo;${escapeHtml(data.artworkTitle)}&rdquo;.`)}

    <div style="border-top:1px solid ${INK};border-bottom:1px solid ${INK};padding:28px 0;margin:28px 0;text-align:center;">
      <p style="font-family:${SANS};font-size:10px;color:${STONE};margin:0 0 10px 0;letter-spacing:0.22em;text-transform:uppercase;">Payout</p>
      <p style="font-family:${SERIF};font-size:42px;font-weight:400;color:${INK};margin:0;letter-spacing:-0.01em;">${formatCurrency(data.payoutAmount)}</p>
      <p style="font-family:${SERIF};font-size:14px;font-style:italic;color:${STONE};margin:10px 0 0 0;">&mdash; transferred to your Stripe account.</p>
    </div>

    ${ctaButton('View earnings', `${APP_URL}/artist/earnings`)}
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
    ${kicker('Order cancelled')}
    ${headline('Your order has', 'been cancelled.')}
    ${lede(`Hello ${escapeHtml(data.buyerName || 'there')}, your order for &ldquo;${escapeHtml(data.artworkTitle)}&rdquo; has been cancelled and a full refund has been issued to your original payment method. Refunds typically appear within five to ten business days.`)}

    ${ledger([
      ['Order', `<span style="font-family:${SANS};font-size:11px;color:${STONE};letter-spacing:0.06em;">${escapeHtml(data.orderId)}</span>`],
      ['Reason', escapeHtml(data.reason)],
    ])}

    ${divider()}

    ${body('If you have any questions, simply reply to this email and we&rsquo;ll be happy to help.')}

    ${ctaButton('Keep looking', `${APP_URL}/browse`)}
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
  const firstName = (data.name || '').split(' ')[0] || 'friend';

  const principles = isArtist
    ? [
        'A curated room &mdash; every work is reviewed before it goes live.',
        'Free to list until your first sale, then thirty dollars a month.',
        'Payouts go straight to your Stripe account after delivery.',
        'Keep the rights to your work, always.',
      ]
    : [
        'A curated room &mdash; every work is reviewed before it goes live.',
        'Payment is held securely until your artwork is in your hands.',
        'Forty-eight hours to inspect the work after delivery.',
        'All artists are based in Australia.',
      ];

  const ctaText = isArtist ? 'Begin your onboarding' : 'Start looking';
  const ctaUrl = isArtist ? `${APP_URL}/artist/onboarding` : `${APP_URL}/browse`;

  const html = emailWrapper(`
    ${kicker('Welcome')}
    ${headline(`Hello, ${escapeHtml(firstName)}.`, '')}
    ${lede(
      isArtist
        ? 'You&rsquo;ve joined a small, careful marketplace for Australian artists. What follows is a short list of the things that matter here.'
        : 'You&rsquo;ve joined a small, careful marketplace for original Australian art. What follows is a short list of the things that matter here.'
    )}

    ${numberedList(principles)}

    ${ctaButton(ctaText, ctaUrl)}
  `);

  return safeSend({
    to: data.email,
    subject: isArtist ? 'Welcome to Signo — let&rsquo;s get your work online' : 'Welcome to Signo',
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
    ${kicker('Your first sale')}
    ${headline('A milestone,', escapeHtml(firstName) + '.')}
    ${lede(`You just sold &ldquo;${escapeHtml(data.artworkTitle)}&rdquo; for ${formatCurrency(data.saleAmount)}. The funds are on their way to your bank account. This is a big moment &mdash; congratulations.`)}

    ${ledger([
      ['Sale', formatCurrency(data.saleAmount)],
      ['Your payout', formatCurrency(data.payoutAmount), 'font-weight:500;'],
    ])}

    <p style="font-family:${SERIF};font-size:15px;color:${INK};margin:0 0 8px 0;font-style:italic;">&mdash; And one practical note</p>
    ${body('Until now, your listings have been free. From here, your $30&thinsp;/&thinsp;month subscription begins. Add a payment method within fourteen days to keep your work visible. If you don&rsquo;t, your listings will quietly pause &mdash; nothing is deleted, and you can reactivate at any time.')}

    ${ctaButton('Add payment method', `${APP_URL}/artist/subscribe`)}

    ${numberedList([
      'Your work stays on Signo &mdash; nothing is deleted.',
      'You keep this sale in full, less Stripe fees.',
      'The subscription begins when you add payment.',
      'Cancel at any time &mdash; listings simply pause.',
    ])}

    ${divider()}

    <p style="font-family:${SERIF};font-size:15px;font-style:italic;color:${STONE};margin:0;line-height:1.7;text-align:center;">
      Thank you for being part of Signo. We&rsquo;re eager to see what comes next.
    </p>
  `);

  return safeSend({
    to: data.email,
    subject: 'A milestone — your first sale on Signo',
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 9. DELIVERY CONFIRMATION (to buyer)
// TODO: Trigger when delivery_deadline is reached (shipped_at + 7 days)
//       in the escrow cron/scheduled function (src/app/api/cron/expire-grace-periods)
// ════════════════════════════════════════════════════════════════════

export interface DeliveryConfirmationData {
  buyerEmail: string;
  buyerName: string;
  artworkTitle: string;
  artworkImageUrl?: string;
  artistName: string;
  orderId: string;
}

export async function sendDeliveryConfirmationEmail(data: DeliveryConfirmationData) {
  const imageBlock = data.artworkImageUrl
    ? `<div style="margin:4px 0 32px 0;background-color:${CREAM};">
        <img src="${data.artworkImageUrl}" alt="${escapeHtml(data.artworkTitle)}" style="width:100%;max-width:552px;display:block;border:0;" />
      </div>`
    : '';

  const html = emailWrapper(`
    ${kicker('Delivered')}
    ${headline('Your work has', 'arrived.')}
    ${lede(`Hello ${escapeHtml(data.buyerName || 'there')}, &ldquo;${escapeHtml(data.artworkTitle)}&rdquo; by ${escapeHtml(data.artistName)} should now be with you. You have forty-eight hours to inspect the work. If everything is in order, do nothing &mdash; payment will release to the artist automatically.`)}

    ${imageBlock}

    ${ctaButton('Report a problem', `${APP_URL}/orders/${data.orderId}`)}

    ${divider()}

    <p style="font-family:${SERIF};font-size:15px;font-style:italic;color:${STONE};margin:0;line-height:1.7;">
      If all is well, no action is needed. Enjoy living with the work.
    </p>
  `);

  return safeSend({
    to: data.buyerEmail,
    subject: `Delivered — "${escapeHtml(data.artworkTitle)}"`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 10. DISPUTE ACKNOWLEDGEMENT (to buyer)
// TODO: Trigger when a dispute is created (in the dispute submission handler)
// ════════════════════════════════════════════════════════════════════

export interface DisputeAcknowledgementData {
  buyerEmail: string;
  buyerName: string;
  artworkTitle: string;
  artistName: string;
  orderId: string;
  disputeReason: string;
}

export async function sendDisputeAcknowledgementEmail(data: DisputeAcknowledgementData) {
  const html = emailWrapper(`
    ${kicker('We have your report')}
    ${headline('We are looking', 'into it.')}
    ${lede(`Hello ${escapeHtml(data.buyerName || 'there')}, we&rsquo;ve received your report about &ldquo;${escapeHtml(data.artworkTitle)}&rdquo; by ${escapeHtml(data.artistName)}. Our team will review your case and respond within twenty-four hours. Your payment remains held in escrow while we resolve this.`)}

    ${ledger([
      ['Order', `<span style="font-family:${SANS};font-size:11px;color:${STONE};letter-spacing:0.06em;">${escapeHtml(data.orderId)}</span>`],
      ['Report', escapeHtml(data.disputeReason), 'font-style:italic;'],
    ])}

    ${divider()}

    <p style="font-family:${SERIF};font-size:15px;color:${INK};margin:0 0 8px 0;font-style:italic;">&mdash; What happens next</p>
    ${body('We&rsquo;ll contact both you and the artist to understand the situation fully. Our aim is a fair resolution for everyone.')}

    ${body(`If you need to add information, reply to this email or write to ${textLink('hello@signoart.com.au', 'mailto:hello@signoart.com.au')}.`)}
  `);

  return safeSend({
    to: data.buyerEmail,
    subject: `We have your report — Order ${escapeHtml(data.orderId.slice(0, 8))}`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 11. LISTINGS PAUSED (to artist — grace period expired)
// ════════════════════════════════════════════════════════════════════

export interface ListingsPausedData {
  email: string;
  artistName: string;
}

export async function sendListingsPaused(data: ListingsPausedData) {
  const html = emailWrapper(`
    ${kicker('Listings paused')}
    ${headline('A quiet pause,', 'not the end.')}
    ${lede(`Hello ${escapeHtml(data.artistName || 'there')}, your fourteen-day grace period has ended and your listings are now hidden from collectors.`)}

    ${body('Nothing has been deleted. Your work will reappear the moment you add a payment method and reactivate your subscription.')}

    ${ctaButton('Reactivate listings', `${APP_URL}/artist/subscribe`)}
  `);

  return safeSend({
    to: data.email,
    subject: 'Your Signo listings have been paused',
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 10b. GRACE PERIOD REMINDER (to artist — approaching deadline)
// ════════════════════════════════════════════════════════════════════

export interface GracePeriodReminderData {
  email: string;
  artistName: string;
  daysRemaining: number;
}

export async function sendGracePeriodReminder(data: GracePeriodReminderData) {
  const dayWord = data.daysRemaining === 1 ? 'day' : 'days';
  const html = emailWrapper(`
    ${kicker('A gentle reminder')}
    ${headline(`${data.daysRemaining} ${dayWord}`, 'remain.')}
    ${lede(`Hello ${escapeHtml(data.artistName || 'there')}, there ${data.daysRemaining === 1 ? 'is' : 'are'} ${data.daysRemaining} ${dayWord} left to add a payment method for your Signo subscription.`)}

    ${body('If you don&rsquo;t add one before the deadline, your listings will pause and be hidden from collectors. Nothing is deleted &mdash; you can reactivate at any time.')}

    ${ctaButton('Add payment method', `${APP_URL}/artist/subscribe`)}
  `);

  return safeSend({
    to: data.email,
    subject: `${data.daysRemaining} ${dayWord} left — add your payment method`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 12. NEW ARTWORK BY FOLLOWED ARTIST (to follower)
// TODO: Trigger this when an artwork is approved (in the admin approval
//       handler or artwork status update API) — query the follows table
//       for the artist's followers and send to each.
// ════════════════════════════════════════════════════════════════════

export interface NewArtworkFollowNotificationData {
  followerEmail: string;
  followerName: string;
  artistName: string;
  artistId: string;
  artworkTitle: string;
  artworkId: string;
  artworkImageUrl?: string;
}

export async function sendNewArtworkFollowNotification(data: NewArtworkFollowNotificationData) {
  const imageBlock = data.artworkImageUrl
    ? `<div style="margin:4px 0 32px 0;background-color:${CREAM};">
        <img src="${data.artworkImageUrl}" alt="${escapeHtml(data.artworkTitle)}" style="width:100%;max-width:552px;display:block;border:0;" />
      </div>`
    : '';

  const html = emailWrapper(`
    ${kicker('New work')}
    ${headline(`A new piece by`, escapeHtml(data.artistName) + '.')}
    ${lede(`Hello ${escapeHtml(data.followerName || 'there')}, ${escapeHtml(data.artistName)} has just added a new work to their room on Signo.`)}

    ${imageBlock}

    ${ledger([
      ['Work', escapeHtml(data.artworkTitle), 'font-style:italic;'],
      ['Artist', `<a href="${APP_URL}/artists/${data.artistId}" style="color:${INK};text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;">${escapeHtml(data.artistName)}</a>`],
    ])}

    ${ctaButton('View the work', `${APP_URL}/artwork/${data.artworkId}`)}
  `);

  return safeSend({
    to: data.followerEmail,
    subject: `A new work by ${escapeHtml(data.artistName)} — "${escapeHtml(data.artworkTitle)}"`,
    html,
  });
}

// ════════════════════════════════════════════════════════════════════
// 13. TRADE ENQUIRY NOTIFICATION (to admin)
// ════════════════════════════════════════════════════════════════════

export interface TradeEnquiryNotificationData {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  businessType: string;
  description: string;
  budgetRange: string;
}

export async function sendTradeEnquiryNotification(data: TradeEnquiryNotificationData) {
  const rows: Array<[string, string, string?]> = [
    ['Business', escapeHtml(data.businessName), 'font-style:italic;'],
    ['Contact', escapeHtml(data.contactName)],
    ['Email', `<a href="mailto:${escapeHtml(data.email)}" style="color:${INK};text-decoration:underline;">${escapeHtml(data.email)}</a>`],
  ];
  if (data.phone) rows.push(['Phone', escapeHtml(data.phone)]);
  rows.push(['Industry', escapeHtml(data.businessType)]);
  rows.push(['Budget', escapeHtml(data.budgetRange), 'font-weight:500;']);

  const html = emailWrapper(`
    ${kicker('Trade enquiry')}
    ${headline('A new trade', 'enquiry.')}
    ${lede(`A new enquiry has arrived through the trade form on Signo.`)}

    ${ledger(rows)}

    ${divider()}

    <p style="font-family:${SANS};font-size:10px;color:${STONE};margin:0 0 12px 0;letter-spacing:0.22em;text-transform:uppercase;">Description</p>
    <p style="font-family:${SERIF};font-size:16px;color:${INK};margin:0;line-height:1.7;font-style:italic;">&ldquo;${escapeHtml(data.description)}&rdquo;</p>
  `);

  return safeSend({
    to: 'hello@signoart.com.au',
    subject: `Trade enquiry — ${escapeHtml(data.businessName)}`,
    html,
  });
}
