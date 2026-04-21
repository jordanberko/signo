# Deferred from Payment + Escrow Audit (Phase 2)

These were identified in the Phase 1 audit (see audit report in session
history) and deliberately deferred. Listed so they don't get lost.

## Medium

### M1 — `charge.refunded` webhook handler
A refund issued from the Stripe dashboard (rather than via the app's
dispute resolution flow) bypasses `/api/stripe/payment-webhook`, so
`orders.status` doesn't reflect the refund. Low operational likelihood
but easy to get wrong when the team does manual refunds.
- Add a `charge.refunded` case to `src/app/api/stripe/payment-webhook/route.ts`
- Look up the order by `stripe_payment_intent_id` (a `Charge` has
  `payment_intent`) and set `status = 'refunded'` if it isn't already.

### M3 — In-memory rate limiter
`src/lib/rate-limit.ts` is per-Vercel-function-instance, not global.
Under autoscaling the 10-per-hour checkout cap is really "10 per hour
per warm instance". Fine for abuse prevention, not fine for compliance
or strict quotas.
- Swap for Upstash Redis or Vercel KV when traffic justifies it.
- Or: move to a DB-backed sliding window using a `rate_limit_events` table.

### M4 — Sub-cent defensive rounding
`Math.round(amount * 100)` is fine for `decimal(10,2)` inputs but breaks
silently on sub-cent precision. The `price_aud` column is `decimal(10,2)`
so we're safe today.
- Add an explicit assertion / clamp in `calculateStripeFee` and the
  `unit_amount` conversion in `/api/checkout/create-session`.

### M5 — Shipping address in Stripe session metadata
`src/app/api/checkout/create-session/route.ts` serialises the full
shipping address as a JSON string and passes it through session
metadata. Stripe caps each metadata value at 500 characters. A long
address (unlikely but possible) truncates silently, and a truncated
JSON string throws when the webhook tries to `JSON.parse`, killing
order creation.
- Persist the shipping address in a `pending_checkouts` (or similar)
  table keyed by `checkout_session_id` before calling Stripe.
- Webhook looks up the address by session id instead of parsing from
  metadata.

## Low

### L1 — Remove unused `@stripe/stripe-js`
`package.json` declares `@stripe/stripe-js ^9.0.0` but nothing in `src/`
imports it. Checkout is 100% server-driven via Stripe-hosted Checkout.
- `npm uninstall @stripe/stripe-js`

### L2 — Consolidate Stripe import pattern
Subscription webhook uses the deprecated `stripe` Proxy export
(`src/lib/stripe/config.ts:23`). Payment webhook uses `getStripe()`.
Pick one and remove the Proxy. Prefer `getStripe()`.
- `src/app/api/stripe/subscription-webhook/route.ts:3` — change to
  `import { getStripe } from '@/lib/stripe/config';` and call inside
  the handler.
- Remove the deprecated `stripe` Proxy export from
  `src/lib/stripe/config.ts` once no callers remain.

### L3 — Insufficient platform balance on transfer
`createTransfer` in `src/lib/stripe/connect.ts` will throw if the
platform balance can't cover the transfer (e.g. charges still pending
availability). `releaseFunds` logs this as a hard failure and the
cron will retry tomorrow. Cleaner: detect the Stripe error type
(`balance_insufficient`) and leave a "retry later" breadcrumb
without treating it as a fatal failure in the logs.

### L4 — No integration tests for payment flows
Only `src/lib/__tests__/utils.test.ts` exists. Nothing covers:
- The webhook order-creation path
- The escrow release / refund functions
- The dispute resolution path
Add Vitest specs that mock Stripe and Supabase, plus a Stripe CLI
`stripe trigger` harness wired up in CI.

## Stripe live-mode polish

The Stripe platform account (`acct_1MsXu7AFoloYAF9Y`) is `type: standard`,
which means `POST /v1/account` is blocked for self-updates — these all
require the Stripe Dashboard UI. Confirmed via failed API attempt on
2026-04-21: every field returned *"You cannot use this method on your own
account: you may only use it on connected accounts."*

### Branding & public details (attempted via API 2026-04-21 — all rejected)

**Dashboard → Settings → Branding** — <https://dashboard.stripe.com/settings/branding>
- [ ] Primary color: `null` → `#1a1a18` (editorial ink; matches `--color-ink` token)
- [ ] Secondary/accent color: `null` → `#c45d3e` (terracotta; matches `--color-accent` token)
- [ ] Icon / logo — deferred, upload when brand assets are ready

**Dashboard → Settings → Public details** — <https://dashboard.stripe.com/settings/public>
- [ ] Public business name: `Naked Miles` → `Signo Art`
- [ ] Website: `https://signo-tau.vercel.app/` → `https://signoart.com.au`

**Dashboard → Settings → Account details** (display name) — <https://dashboard.stripe.com/settings/account>
- [ ] Display name: `signo-tau.vercel.app` → `Signo Art`

### MCC (merchant category code)
Current: `5712` *(Furniture, Home Furnishings, and Equipment Stores)* — wrong category.
Target: `5971` *(Art Dealers & Galleries)* — or `5970` *(Artist Supply & Craft Shops)* as a second option.
Affects card interchange classification and default merchant category at the network level.
- [ ] Dashboard → Settings → Business details → MCC

### Support contact details
Currently on `business_profile`:
- `support_phone: "+61425944664"` (personal number — will surface on receipts / refund notifications)
- `support_email: null`
- `support_url: null`
Actions, once Signo has dedicated support contact info:
- [ ] Swap `support_phone` to a generic support line (or remove if email-only)
- [ ] Set `support_email` to a real `support@signoart.com.au` (or equivalent)
- [ ] Optionally set `support_url` to a help page

### Afterpay / Clearpay BNPL in live checkout
`capabilities.afterpay_clearpay_payments: active` on the platform, but the default Payment Method Configuration has it `off` for live Checkout sessions.
- [ ] Decide whether to turn on BNPL for live checkout (popular for AU art buyers)
- Dashboard → Settings → Payments → Payment methods

### Safe-as-is (do NOT change)
- `company.name: "Berkovich, Jordan Jonathan"` — legal sole-proprietorship entity name on Stripe; must match ABN/tax registration. Not a customer-facing field.
- `company.structure: "sole_proprietorship"` — reflects actual business structure; change only if Signo is restructured.
- `settings.payments.statement_descriptor: "SIGNO ART"` — already correct.
- `settings.card_payments.statement_descriptor_prefix: "SIGNO"` — already correct.
