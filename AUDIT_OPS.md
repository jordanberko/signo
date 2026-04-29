# AUDIT_OPS — Operational readiness

Pre-launch operational audit of the Signo codebase. Investigation only — no code changes accompany this document. Findings cite specific file paths and line numbers; verify before acting on any individual claim.

Scope: silent-failure sweep, critical-event coverage matrix, credentials inventory, prioritised fixes.

Generated: 2026-04-29.

---

## 1. Executive summary

- **Money paths are partially instrumented.** Escrow transfer failures ([`src/lib/stripe/escrow.ts:197-216`](src/lib/stripe/escrow.ts)) and the `/checkout/success` webhook race ([`src/app/api/checkout/success/route.ts`](src/app/api/checkout/success/route.ts)) fire `sendOpsAlert`. But **refund failures**, **payment-intent failures**, and **payment-webhook email failures** all log only — no Discord ping.
- **All four production crons fail silently.** [`release-escrow`](src/app/api/cron/release-escrow/route.ts), [`cancel-unshipped`](src/app/api/cron/cancel-unshipped/route.ts), [`release-reservations`](src/app/api/cron/release-reservations/route.ts), [`expire-grace-periods`](src/app/api/cron/expire-grace-periods/route.ts) — each catches exceptions, logs, returns 500. Vercel Cron does not retry. A failed escrow release stalls artist payout indefinitely with no signal until the artist complains.
- **Subscription webhook returns 200 on any handler error.** [`src/app/api/stripe/subscription-webhook/route.ts:244-248`](src/app/api/stripe/subscription-webhook/route.ts) — outer catch swallows DB write failures and returns 200 to prevent retry loops. This means artist subscription state can drift permanently out of sync with Stripe and no alert fires.
- **Webhook signature verification failures are logged, not alerted.** Both webhook handlers reject with 400 on bad signature ([`payment-webhook:48-64`](src/app/api/stripe/payment-webhook/route.ts), [`subscription-webhook:29-42`](src/app/api/stripe/subscription-webhook/route.ts)) — appropriate response code, but a sustained pattern of failures (misrotated secret, attack, broken integration) goes unnoticed.
- **What's solid:** `safeSend` is defensively designed and never throws ([`src/lib/email.ts:205-231`](src/lib/email.ts)). `sendOpsAlert` is missing-URL safe and never throws ([`src/lib/ops-alert.ts`](src/lib/ops-alert.ts)). Payment webhook idempotency via `processed_stripe_events` is correctly implemented. Cron auth via `CRON_SECRET` is consistent across all four routes. Stripe Connect transfer idempotency keys prevent double-payouts. The escrow + checkout-success Discord wiring proves the alerting infrastructure works end-to-end.

**Top fix to ship first:** wrap each cron's outer catch with `sendOpsAlert(level: 'error')`. ~10 lines × 4 files. Single PR. Removes the largest "silent failure" surface in the system.

---

## 2. Silent failure findings

| File:line | What fails silently | Severity | Recommended fix |
| --- | --- | --- | --- |
| [`src/app/api/stripe/subscription-webhook/route.ts:244-248`](src/app/api/stripe/subscription-webhook/route.ts) | Outer try/catch returns 200 on any internal handler error. DB upsert failures (lines 64-79) leave subscription state desynced from Stripe with no alert. | **HIGH** | Throw on DB write errors so Stripe retries (return 500); fire `sendOpsAlert` on persistent failures |
| [`src/app/api/cron/release-escrow/route.ts`](src/app/api/cron/release-escrow/route.ts), [`cancel-unshipped/route.ts`](src/app/api/cron/cancel-unshipped/route.ts), [`release-reservations/route.ts`](src/app/api/cron/release-reservations/route.ts), [`expire-grace-periods/route.ts`](src/app/api/cron/expire-grace-periods/route.ts) | All four cron handlers catch exceptions, log via `console.error`, return 500. Vercel Cron does not retry. Failed escrow release = artist payout stalled indefinitely. | **HIGH** | Wrap each outer catch with `sendOpsAlert(level: 'error')` including handler name + error |
| [`src/lib/stripe/escrow.ts:282-286`](src/lib/stripe/escrow.ts) | `refundBuyer` catch block logs and returns `{success: false, error}`. No alert. Buyer's refund silently fails; admin who triggered it sees a failure return value but nothing pings ops. | **HIGH** | Mirror the `releaseFunds` pattern: fire `sendOpsAlert` in the catch block before returning |
| [`src/app/api/stripe/payment-webhook/route.ts:48-64`](src/app/api/stripe/payment-webhook/route.ts), [`subscription-webhook/route.ts:29-42`](src/app/api/stripe/subscription-webhook/route.ts) | Webhook signature verification failure returns 400 + `console.error`. A sustained pattern (misrotated secret, attack) goes unnoticed. | **HIGH** | `sendOpsAlert(level: 'error')` on signature failure with the source IP if available |
| [`src/app/api/stripe/payment-webhook/route.ts:301-352`](src/app/api/stripe/payment-webhook/route.ts) | Order-confirmation + new-sale-notification emails are wrapped in local try/catch. Resend outage = silent radio silence to buyer + artist. Order is committed, no shipping signal. | **HIGH** | Inspect `safeSend` return value; `sendOpsAlert` if `success: false` for critical-flow emails |
| [`src/app/api/admin/artworks/[id]/review/route.ts:42-102`](src/app/api/admin/artworks/[id]/review/route.ts) | Admin artwork approval/rejection updates the row + sends artist email. **No audit log.** Who approved what, when, and why is unknowable post-hoc. | **MED** | Add an `admin_audit_log` table; insert one row per admin action |
| [`src/app/api/cron/expire-grace-periods/route.ts:46-103`](src/app/api/cron/expire-grace-periods/route.ts) | Per-profile email sends inside the loop catch errors and increment a `failed` counter. If 10 artists silently lose their listings due to email outage, only function logs reveal it. | **MED** | If `failed > 0` at end of cron, fire `sendOpsAlert` with count and a sample error |
| [`src/app/api/stripe/payment-webhook/route.ts:301-305`](src/app/api/stripe/payment-webhook/route.ts) | `Promise.all` (not `allSettled`) for buyer/artist/artwork profile fetches. If any query throws, entire block rejects, outer catch returns 500, Stripe retries. Order is already committed at this point — retry hits idempotency guard and skips, so emails simply never send. | **MED** | Use `Promise.allSettled`; handle rejected results individually so emails are best-effort |
| [`src/app/api/stripe/subscription-webhook/route.ts:48-243`](src/app/api/stripe/subscription-webhook/route.ts) | No `processed_stripe_events` idempotency check. On Stripe retry, `subscription_status` and `grace_period_deadline` get re-set, potentially clobbering newer state. | **MED** | Add idempotency check using the existing `processed_stripe_events` table (mirror payment-webhook pattern) |
| [`src/lib/stripe/escrow.ts:131-194`](src/lib/stripe/escrow.ts) | First-sale activation email failure logs at `warn` level inside a nested try/catch. Artist's `subscription_status` flips to `pending_activation` but they receive no email explaining the 14-day grace period. | **MED** | Bump email failure to `error` level; consider `sendOpsAlert` for first-sale flow specifically |
| [`src/app/api/contact/route.ts:62-82`](src/app/api/contact/route.ts), [`src/app/api/trade/route.ts`](src/app/api/trade/route.ts) | `Promise.allSettled` for ops-alert + email sends; results never inspected. If both Discord and Resend are down, contact form sits in DB unread with no breadcrumb. | **LOW** | Inspect allSettled results; log at `error` level if any rejected |
| [`src/lib/stripe/escrow.ts:337-340`](src/lib/stripe/escrow.ts) | Auto-release loop uses `Promise.all` for artist + artwork fetches. Failure means payout email never sends, but funds already transferred. Observable via Stripe dashboard, but the artist gets no email. | **LOW** | Switch to `Promise.allSettled` |
| [`src/lib/supabase/storage.ts:154-234`](src/lib/supabase/storage.ts) | Upload errors are surfaced to the user via the upload component, but ops has no signal if the storage bucket is broadly failing (e.g. RLS misconfig, bucket deleted). | **LOW** | Optional: aggregate upload error rate in a structured log; alert if rate exceeds a threshold |

---

## 3. Critical event coverage matrix

`sendOpsAlert` is the canonical Discord alert helper at [`src/lib/ops-alert.ts`](src/lib/ops-alert.ts). Currently fired in 3 places: `escrow.releaseFunds` catch, `/api/checkout/success` order-missing branch, and `/api/contact` form submission.

| Event | Code path | Currently alerted? | Severity | Recommended channel |
| --- | --- | --- | --- | --- |
| Failed Stripe payment intent | [`payment-webhook:355-363`](src/app/api/stripe/payment-webhook/route.ts) (`payment_intent.payment_failed`) | Logged only | MED | Discord via `sendOpsAlert` — buyer attempt without follow-through is worth knowing |
| Failed Stripe Connect transfer (escrow payout) | [`escrow.ts:197-216`](src/lib/stripe/escrow.ts) | **Yes (Discord)** | HIGH | Already covered. Keep |
| Webhook signature verification failure | [`payment-webhook:48-64`](src/app/api/stripe/payment-webhook/route.ts), [`subscription-webhook:29-42`](src/app/api/stripe/subscription-webhook/route.ts) | Logged only | HIGH | Discord — sustained failures = misrotated secret or attack |
| Webhook idempotency duplicate detected | [`payment-webhook:92-96, 160-164`](src/app/api/stripe/payment-webhook/route.ts) (`processed_stripe_events` check) | Logged at info level | LOW | Structured log only — duplicates are handled gracefully and noisy if alerted |
| Database error during order processing | [`payment-webhook:254-287`](src/app/api/stripe/payment-webhook/route.ts) (insert + artwork status flip) | Logged only; throws → 500 → Stripe retries | MED | Discord — repeated failures across retries indicate persistent DB problem |
| Image upload to Supabase Storage failure | [`storage.ts:154-234`](src/lib/supabase/storage.ts) | Logged only; surfaced to user via upload component | MED | Structured log + client UX (already in place). Discord only if a broader pattern emerges |
| Email send failure (Resend) | [`email.ts:205-231`](src/lib/email.ts) (`safeSend`) | Logged only; never thrown | MED | Discord for critical-flow emails (order confirmation, payout, refund). Log-only for nice-to-have (welcome, follow notifications) |
| Authentication system unavailable | [`src/proxy.ts`](src/proxy.ts) (`updateSession`); per-route auth checks | Silent — manifests as 401/403 to user | HIGH | No alert from app layer (would be high-noise). Consider Vercel-level uptime monitoring on Supabase auth endpoint |
| Cron job failure | All four [`src/app/api/cron/*/route.ts`](src/app/api/cron) | Logged only; returns 500 | HIGH | Discord — Vercel Cron does not retry, so this is the only signal |
| Rate limit exceeded | [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts) callers (e.g. contact, checkout) | Silent — returns 429 to caller | LOW | Structured log at caller. No alert unless abuse pattern detected — that's a separate concern |
| Subscription creation/cancellation failure | [`subscription-webhook:50-243`](src/app/api/stripe/subscription-webhook/route.ts) — DB upserts inside switch cases | Logged only; outer catch returns 200 anyway | HIGH | Discord — silent state desync on the artist's billing flow is a top-tier problem |
| Refund processing failure | [`escrow.ts:282-286`](src/lib/stripe/escrow.ts) (`refundBuyer` catch) | Logged only | HIGH | Discord — buyer expects refund, hard to recover from silently |
| Manual admin actions (approve/reject, suspend) | [`src/app/api/admin/artworks/[id]/review/route.ts:42-102`](src/app/api/admin/artworks/[id]/review/route.ts) and similar admin routes | No audit log, no alert | MED | DB audit log table (`admin_audit_log`); Discord optional for sensitive actions like account suspension |

---

## 4. Credentials inventory (template)

Owner for all entries below: **Jordan Berkovich**.

Storage legend:
- **VercelProd**: Vercel project → Settings → Environment Variables, scope = Production
- **VercelPreview**: same, scope = Preview (per-branch overrides exist for STRIPE_SECRET_KEY)
- **VercelDev**: same, scope = Development
- **Local**: `.env.local` on the laptop (and `.env.prod2.tmp`, `.env.prev2.tmp` snapshots)
- **LaptopOnly**: never propagate to Vercel

Sensitivity legend:
- **Public**: shipped to the browser bundle (`NEXT_PUBLIC_*` prefix). Public exposure is intentional.
- **Secret**: server-only. Treat as a credential — rotate on any suspicion of leak.

### Supabase

| Variable | Sensitive? | Storage | Recovery procedure | Current value |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | VercelProd + VercelPreview + VercelDev + Local | Supabase Dashboard → Settings → API → Project URL | `_____________________` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (RLS-bounded) | VercelProd + VercelPreview + VercelDev + Local | Supabase Dashboard → Settings → API → anon key | `_____________________` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** (admin, bypasses RLS) | VercelProd + Local | Supabase Dashboard → Settings → API → service_role → "Reveal" / regenerate | `_____________________` |

### Stripe

| Variable | Sensitive? | Storage | Recovery procedure | Current value |
| --- | --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | **Secret** | VercelProd (live) + VercelPreview override on `group-1-security-fixes` + Local (test) | Stripe Dashboard → Developers → API keys → Roll | `_____________________` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | VercelProd + VercelPreview + VercelDev + Local | Stripe Dashboard → Developers → API keys → Publishable | `_____________________` |
| `STRIPE_PAYMENT_WEBHOOK_SECRET` | **Secret** | VercelProd + Local | Stripe Dashboard → Developers → Webhooks → (payment endpoint) → Signing secret → Roll | `_____________________` |
| `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` | **Secret** | VercelProd + Local | Stripe Dashboard → Developers → Webhooks → (subscription endpoint) → Signing secret → Roll | `_____________________` |
| `STRIPE_ARTIST_SUBSCRIPTION_PRICE_ID` | Public-ish (product identifier) | VercelProd + Local | Stripe Dashboard → Products → Signo Artist Subscription → Pricing → Copy ID | `_____________________` |
| `STRIPE_ENFORCE_SUBSCRIPTIONS` | Public (feature flag) | VercelProd + Local | Manual toggle — `'true'` or `'false'` | `_____________________` |

### Resend

| Variable | Sensitive? | Storage | Recovery procedure | Current value |
| --- | --- | --- | --- | --- |
| `RESEND_API_KEY` | **Secret** | VercelProd + Local | Resend Dashboard → API Keys → Revoke + Create new | `_____________________` |
| `RESEND_FROM_ADDRESS` | Public | VercelProd + Local | Resend Dashboard → Domains → Verify domain → Set value to `Signo <noreply@signoart.com.au>` | `_____________________` |

### Discord

| Variable | Sensitive? | Storage | Recovery procedure | Current value |
| --- | --- | --- | --- | --- |
| `DISCORD_OPS_WEBHOOK_URL` | **Secret** (URL grants posting rights) | VercelProd | Discord server → channel settings → Integrations → Webhooks → Edit/regenerate URL | `_____________________` |

### Application

| Variable | Sensitive? | Storage | Recovery procedure | Current value |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public | VercelProd (`https://signoart.com.au`) + Local (`http://localhost:3000`) | Manual; per-environment | `_____________________` |
| `NEXT_PUBLIC_VERCEL_URL` | Public | VercelPreview only (set to `${VERCEL_URL}` template) | Vercel Project Settings → Environment Variables → set to `${VERCEL_URL}` | `_____________________` |
| `CRON_SECRET` | **Secret** | VercelProd + cron provider config | Generate random 32+ char string; set in Vercel; update Vercel Cron job auth headers | `_____________________` |

### Operator-only (never propagate to Vercel)

| Variable | Sensitive? | Storage | Recovery procedure | Current value |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | **Secret** | LaptopOnly (commented out in `.env.example`) | Supabase Dashboard → Settings → Database → Direct connection (port 5432). Note: Transaction Pooler on port 6543 breaks `psql` interactive use — see MIGRATIONS.md | `_____________________` |

### Vercel auto-populated

| Variable | Sensitive? | Storage | Notes |
| --- | --- | --- | --- |
| `VERCEL_URL` | Public | Vercel auto-populated per deploy | No manual action; server-side fallback in [`src/lib/urls.ts`](src/lib/urls.ts) |

### Documentation gap check

All 16 variables referenced in code are declared in [`.env.example`](signo/.env.example). No secret variables are referenced in code without being in the example file. `DATABASE_URL` appears in `.env.example` (commented out, with usage warning) and is intentionally not used by the application code.

---

## 5. Recommended fixes — priority order

1. **Cron failure alerts** — *small effort, ~40 lines total across 4 files*
   Wrap each of the four cron handlers' outer `catch` blocks with `sendOpsAlert(level: 'error')`. Includes handler name, error message, and a count of affected items where available. Highest signal-to-effort ratio in the audit. Single PR.

2. **Subscription webhook resilience** — *medium effort, single file, requires careful testing*
   Stop returning 200 on internal handler errors. Throw on DB upsert failures so Stripe retries. Add `processed_stripe_events` idempotency check (mirror the payment-webhook pattern) so retries don't clobber newer state. Wire `sendOpsAlert` on persistent failures. Critical for keeping artist subscription state in sync with Stripe.

3. **Refund + signature failure + payment-intent failure alerts** — *small effort, 3 sites, ~5 lines each*
   Mirror the existing `releaseFunds` Discord-alert pattern in `refundBuyer` ([`escrow.ts:282`](src/lib/stripe/escrow.ts)). Add signature-failure alerts to both webhook routes. Add `payment_intent.payment_failed` alert in payment-webhook handler. Bundle as one PR — same shape, same helper.

4. **Payment webhook email-failure alerts** — *small effort, single file*
   Inspect `safeSend` return value for the order-confirmation + new-sale-notification + payout-released sends. Fire `sendOpsAlert` if any return `{success: false}`. Currently these emails fail silently with only a `[EMAIL_FAILED]` warn-level log. Without this, a Resend outage produces zero ops signal during the most customer-visible moment.

5. **Admin audit log** — *medium effort, requires migration*
   Add an `admin_audit_log` table (`id`, `admin_user_id`, `action`, `target_type`, `target_id`, `metadata jsonb`, `created_at`). Insert one row per admin action across `src/app/api/admin/*` routes. Optional Discord alert for sensitive actions (account suspension specifically). Without this, post-hoc investigation of "who approved this artwork" requires git history triangulation.

### Effort sizing legend

- **small**: <30 lines, single concern, no schema change
- **medium**: 30–100 lines, may touch a schema migration, needs careful test plan
- **large**: 100+ lines, multi-file refactor, or breaking change

### Out of scope for this audit (worth tracking separately)

- Vercel-level uptime monitoring on Supabase auth endpoint
- Real telemetry sink (Sentry/Supabase) for `error.tsx` + `global-error.tsx` — already on the post-launch follow-up list
- Reconciliation cron for Stripe sessions vs orders table — already on the post-launch follow-up list
- API error response shape consistency — already on the post-launch follow-up list
- Stale `.next` build artefacts cleanup — already on the post-launch follow-up list

---

*End of audit.*
