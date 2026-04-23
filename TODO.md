# Deferred from Payment + Escrow Audit (Phase 2)

These were identified in the Phase 1 audit (see audit report in session
history) and deliberately deferred. Listed so they don't get lost.

## Pre-launch blockers

### Production Stripe env vars — RESOLVED for test mode

**Status 2026-04-22: RESOLVED for test mode (pending Commit 2 post-DNS verification + prod redeploy).**

Original framing was "webhook secret *mismatch*". The actual root cause
was broader: missing env vars + Preview-only scoping. All six `STRIPE_*`
vars (`STRIPE_SECRET_KEY`, `STRIPE_PAYMENT_WEBHOOK_SECRET`,
`STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`, `STRIPE_CONNECT_WEBHOOK_SECRET`,
`STRIPE_SUBSCRIPTION_PRICE_ID`, `STRIPE_ENFORCE_SUBSCRIPTIONS`) were
scoped Preview-only — Production was running against baked-in
build-time snapshots or nothing at all.

Would-have-been consequence if not caught: every real buyer payment
would have succeeded on Stripe (money captured) but every `orders` row
insert would have failed, every artwork would have stayed `reserved`
forever, every artist would have missed their payout. Silent
catastrophic failure.

Fix applied 2026-04-22:
- All six `STRIPE_*` env vars now anchored at Production scope (HTTP
  201 on each `POST /v10/projects/:id/env`).
- Prod redeployed to `dpl_BgsNZLtpKm6FjfDHSXhSvVNB2jsQ`, alias
  repointed.
- Live probe against `signoart.com.au` confirmed payment webhook now
  returns "No signatures found" (function reached) instead of
  "Received undefined" (env missing).
- Webhook endpoint `we_1THAZfAFoloYAF9YCSozHoTi` re-enabled.
- Smoke test confirmed end-to-end DB state: order
  `4b4836e8-4911-4e0e-9706-b6734f43625c`, `artworks.status='sold'`,
  `platform_fee_aud=0`, `artist_payout_aud ≈ 9.52`, `stripe_fee ≈ 0.48`.

**STRIPE_WEBHOOK_SECRET build-time snapshot finding.** Before the fix,
some `STRIPE_*` values were effectively baked into the live Production
bundle at build time rather than resolved at runtime. Any Production
rebuild would have silently dropped the baked-in value and the failure
mode wouldn't have surfaced until the next payment. Re-anchoring all
six to Production scope prevents the silent-drop-on-rebuild failure
mode — the values now live in project settings, not in a deployment
snapshot.

Residual work:
- [ ] Commit 2 (post-DNS verification): fix `RESEND_FROM_ADDRESS` typo
      on Vercel Preview + Production. Current value `Signo
      <noreply@signo.com.au>` (short form — missing `art`); target
      `Signo <noreply@signoart.com.au>`.
- [ ] Redeploy prod after Commit 2 lands so the corrected
      `RESEND_FROM_ADDRESS` ships to the serverless bundle.
- [ ] Re-run the smoke-test purchase after domain verification +
      Commit 2 + redeploy. Verify both buyer AND artist emails
      actually deliver (not just webhook 200).
- [ ] After re-test passes, clean up smoke-test DB rows: order
      `4b4836e8-4911-4e0e-9706-b6734f43625c` and artwork
      `30f505c9-5767-4981-b724-108570af0152`.

### CRITICAL — Live-mode cutover required before launch

Today `signoart.com.au` runs Stripe **test mode** in production. No
live-mode infrastructure exists yet — the fix above resolved test-mode
env vars only.

This blocker is a *pre-launch gate*, not an active production failure.
No real money moves through the platform today — `signoart.com.au`
only accepts test-mode payments — so there is no live-customer risk
right now. What this item blocks is the ability to accept real
payments at all.

Cutting to live mode is a separate, deliberate pre-launch step.
Required actions:
- [ ] Set live-mode `STRIPE_SECRET_KEY` (`sk_live_…`) at Vercel
      Production scope. Do NOT mirror this to Preview scope — previews
      should never touch live money.
- [ ] Register live-mode webhook endpoints in Stripe:
      - Payment webhook at
        `https://signoart.com.au/api/stripe/payment-webhook`
      - Subscription webhook at
        `https://signoart.com.au/api/stripe/subscription-webhook`
      - Connect webhook once Connect live onboarding ships.
- [ ] Capture live-mode signing secrets (`whsec_…`) from each live
      endpoint and set at Production scope:
      `STRIPE_PAYMENT_WEBHOOK_SECRET`,
      `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`,
      `STRIPE_CONNECT_WEBHOOK_SECRET`. Test-mode secrets do NOT
      validate live events and vice versa.
- [ ] Complete Stripe Connect live onboarding for the platform
      account (`acct_1MsXu7AFoloYAF9Y`). Connect is currently test-mode
      only.
- [ ] Recreate the artist subscription price in live mode and update
      `STRIPE_SUBSCRIPTION_PRICE_ID` at Production scope.
- [ ] Keep `STRIPE_ENFORCE_SUBSCRIPTIONS=false` during the cutover;
      flip to `true` only after artist onboarding + subscription flow
      are proven end-to-end in live mode.
- [ ] After cutover: run a real low-value ($1 AUD) live purchase
      end-to-end and verify every step against the same checklist used
      for the 2026-04-22 test-mode smoke test (order insert, artwork
      flip, payout calc, buyer + artist emails).

**Do not flip live-mode on until every other pre-launch blocker in
this file is closed.** This is the last-mile step, not something to
do in parallel with test-mode work.

### CRITICAL — Resend domain verification pending

`signoart.com.au` has been added to Resend as a sending domain but
currently shows status "Not Started" — the required DNS records (SPF,
DKIM, DMARC, and MX if configured) are not yet in place. Until
verification completes, Resend refuses to deliver any email sent from
`@signoart.com.au`, independent of whether the webhook handler's
fire-and-forget issue has been fixed.

Gated on Vercel nameserver migration in progress 2026-04-22.

Residual work (pairs with the blocker above):
- [ ] Complete Vercel nameserver migration for `signoart.com.au`.
- [ ] Add SPF / DKIM / DMARC DNS records as specified by Resend's
      domain page.
- [ ] Wait for Resend to flip the domain status to "Verified".
- [ ] Execute Commit 2 (`RESEND_FROM_ADDRESS` typo fix) + prod
      redeploy.
- [ ] Re-run payment-webhook smoke path; confirm both buyer and
      artist emails deliver to real inboxes.

Surfaced 2026-04-22 during post-smoke-test email investigation: the
Resend dashboard showed zero inbound email requests for the smoke
order, despite the webhook handler running end-to-end successfully.
Two compounding causes identified: (a) fire-and-forget promise
termination in the handler (fixed in `bca8579`), and (b) the
`signoart.com.au` sending domain not yet verified in Resend. Either
alone would drop delivery; both in combination left no evidence at
the send side.

### Migration apply workflow gap
Creating migration files in `supabase/migrations/` does **not**
auto-apply them to Supabase. Both 017 (`reserved` status) and 018
(`processed_stripe_events`) had to be manually pasted into the SQL
Editor after the commit. Each time, the app was broken between commit
and manual apply, and the failure mode was silent in preview until we
hit the relevant code path.

Before multi-developer workflow or CI deployment, set up one of:
- (a) Supabase CLI integration (`supabase db push` in CI). Requires
      linking the project and adding a CI step that runs on deploy.
      Cleanest long-term.
- (b) Automated migration runner on app startup or via a protected
      API route. Risky — can apply partial migrations or race.
- (c) Documented manual apply step in a deploy checklist (e.g. an
      `.github/pull_request_template.md` reminder: "If this PR adds
      a `supabase/migrations/*.sql` file, apply it to the target DB
      before merging"). Zero infra, works today, depends on
      discipline.

Surfaced 2026-04-21 when the Group 2 H3 webhook refactor shipped but
migration 018 wasn't applied — Stripe delivered a paid event, the
webhook hit the missing table, returned 500, and no order was created
until the migration was applied manually and the event was resent.

Related — no operator path for privileged SQL. The
`set_updated_at_artworks` BEFORE UPDATE trigger (migration 001, lines
155–157) unconditionally resets `updated_at = now()`, and PostgREST
service-role bypasses RLS but not BEFORE triggers. With no
`DATABASE_URL` or `supabase db exec` path exposed to preview/prod,
there's no supported way to seed stale rows for reservation/escrow
bug repro — so whichever option above ships, it should also cover an
operator SQL path (dev/preview-gated `DATABASE_URL`, documented
`supabase db …` procedure, or admin-only RPC). Surfaced 2026-04-22
during end-to-end verification of the release-reservations cron.

Related — Vercel env var scoping convention. The Preview-only-scoping
failure mode that caused the "Production Stripe env vars" blocker
above could recur on any env var added during future preview work. No
enforced convention exists today to prevent a developer from scoping a
new secret Preview-only when it's actually required at runtime in
Production. Before multi-developer workflow or post-launch, document
and enforce a convention alongside the migration workflow — e.g. "all
new env vars that affect prod runtime code MUST be added at Production
scope at creation time, not just Preview; CI or a pre-push hook should
flag `process.env.FOO` references whose corresponding Vercel var is
missing from the Production scope." Surfaced 2026-04-22 during the
root-cause analysis of the webhook signing-secret failure.

### Architectural — Webhook endpoint URL is hardcoded to prod
Today there's exactly one payment-webhook endpoint in Stripe and it's
pinned to `signo-tau.vercel.app`. Previews can't exercise the webhook
codepath without manual intervention (adding a second endpoint, as was
done for Group 1 — `we_1TOW8fAFoloYAF9YoTjEVzbT` points at
`signo-git-group-1-security-fixes-...`). That workaround doesn't scale.

Options to consider long-term:
- (a) Maintain separate per-environment webhook endpoints in Stripe,
      one per long-lived branch (main/staging/dev). Branch-scoped Vercel
      env vars pick the right secret.
- (b) CI step that registers a transient webhook endpoint at deploy
      time for each preview and tears it down on PR close. Most work,
      most automated.
- (c) Document a "run `stripe listen --forward-to <preview-url>` in a
      terminal" workflow for developers testing webhook paths on
      previews. Zero infra cost but error-prone.

### Vercel Deployment Protection blocks webhook POSTs
Vercel Deployment Protection (the SSO gate on non-production previews)
intercepts incoming requests at the edge and returns HTTP 401
"Authentication Required" HTML before the serverless function runs.
Stripe — or any third-party POSTer — can never reach the webhook
handler on a preview URL without a workaround.

Production deployments at `signoart.com.au` won't hit this — production
URLs don't sit behind deployment protection. But every non-production
preview that needs webhook testing needs the Protection Bypass for
Automation pattern (see "Webhook testing runbook" below).

Surfaced 2026-04-21 while verifying Group 1 security fixes: Stripe
delivered `checkout.session.completed` to the preview endpoint and
received 401 HTML from Vercel, so the function never ran. Fixed by
appending `?x-vercel-protection-bypass=<token>` to the endpoint URL.

## Webhook testing runbook

Standard pattern for exercising the webhook codepath on a Vercel
preview deploy — use this for Group 2 and Group 3 testing, and for any
future preview-based end-to-end verification.

1. Confirm the project has a Protection Bypass for Automation token
   (Vercel → Project → Settings → Deployment Protection). Create one
   if missing. The token is project-scoped and survives redeploys, and
   is auto-exposed to the runtime as `VERCEL_AUTOMATION_BYPASS_SECRET`.

2. Register the webhook endpoint with the bypass token baked into the
   URL (`stripe webhook_endpoints create --url
   "https://<preview-host>.vercel.app/api/stripe/payment-webhook?x-vercel-protection-bypass=<TOKEN>"
   --enabled-events checkout.session.completed --enabled-events
   charge.dispute.created`). Capture the `whsec_…` signing secret the
   command prints.

3. Rotate `STRIPE_PAYMENT_WEBHOOK_SECRET` in the preview scope of the
   branch being tested:
   `vercel env rm STRIPE_PAYMENT_WEBHOOK_SECRET preview <branch> --yes`
   then `vercel env add STRIPE_PAYMENT_WEBHOOK_SECRET preview <branch>
   --value "$(cat /tmp/whsec.tmp)" --yes`. Use a `chmod 600` tempfile
   so the secret isn't echoed to shell history; `shred` or `rm` it
   after.

4. Trigger a redeploy so the function picks up the rotated env
   (`git commit --allow-empty -m "Chore: rebuild preview after webhook
   rotation" && git push`).

5. Probe the URL to confirm the function is reachable
   (`curl -X POST
   "https://<preview-host>.vercel.app/api/stripe/payment-webhook?x-vercel-protection-bypass=<TOKEN>"`).
   Expected response: HTTP 400 with body containing
   `"Webhook signature verification failed"`. That's the function
   running and correctly rejecting an unsigned body — not the SSO gate
   returning 401 HTML.

6. When the preview is no longer being tested, delete the endpoint
   (`stripe webhook_endpoints delete we_<id> --confirm`).

## Group 3a notes

Reminders that apply when Group 3a (cron configuration in `vercel.json`)
is executed. Do NOT action these before Group 3a begins — left here so
they aren't lost.

### C3 cron schedule change
Once `vercel.json` is updated for Group 3a, the release-reservations
schedule should be `*/5 * * * *` (every 5 minutes), not `*/15 * * * *`.

Rationale: with a 10-minute reservation window (changed 2026-04-22), a
15-minute cron means worst-case cleanup latency is 25 min (10m
reservation + 15m cron gap), effectively defeating the shorter window.
5-minute cron reduces worst case to 15 min, which is the right ratio.

## Medium

### M1 — `charge.refunded` webhook handler
A refund issued from the Stripe dashboard (rather than via the app's
dispute resolution flow) bypasses `/api/stripe/payment-webhook`, so
`orders.status` doesn't reflect the refund. Low operational likelihood
but easy to get wrong when the team does manual refunds.
- Add a `charge.refunded` case to `src/app/api/stripe/payment-webhook/route.ts`
- Look up the order by `stripe_payment_intent_id` (a `Charge` has
  `payment_intent`) and set `status = 'refunded'` if it isn't already.

### M2 — Apply H3 pattern to subscription webhook
`src/app/api/stripe/subscription-webhook/route.ts` silently returns 200
on all errors — the same bug Group 2 is fixing for the payment webhook.
Lower priority than payment webhook because subscription volume is low
right now, but needed before significant artist onboarding: a failed
subscription renewal today silently succeeds and the artist keeps
access despite non-payment.

Once Group 2 lands, port the same pattern to the subscription webhook:
- 400 on signature verification failure
- 200 on unhandled event types
- 200 on already-processed events (check `processed_stripe_events` by
  `event.id`)
- 500 on write failures (so Stripe retries)
- 200 on success (after `processed_stripe_events` insert)

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

### M6 — Convert fire-and-forget Resend sends to awaited try/catch

The payment webhook was fixed in `bca8579` — its two calls to
`sendOrderConfirmation` and `sendNewSaleNotification` are now awaited
inside a try/catch. The same fire-and-forget pattern exists at 6 other
call sites. Under Vercel's serverless Node runtime, unawaited HTTP
requests can be severed the moment the handler returns, silently
dropping emails (which is how the 2026-04-22 smoke test appeared to
succeed while zero emails were delivered — see "Resend domain
verification pending" for the parallel domain cause).

Call sites to convert — same mechanical change in each: `sendFoo({…}).catch((err) => console.error(…))` → `try { await sendFoo({…}) } catch (err) { … }`:

| File | Line | Function |
|------|------|----------|
| `src/lib/stripe/escrow.ts` | 168 | `sendFirstSaleActivation` |
| `src/lib/stripe/escrow.ts` | 320 | `sendPayoutReleased` (auto-release cron) |
| `src/lib/stripe/escrow.ts` | 416 | `sendOrderCancelled` (cancel-unshipped cron) |
| `src/app/api/orders/[id]/ship/route.ts` | 75 | `sendShippingConfirmation` |
| `src/app/api/orders/[id]/complete/route.ts` | 55 | `sendPayoutReleased` |
| `src/app/api/admin/artworks/[id]/review/route.ts` | 70, 77 | `sendArtworkApproved`, `sendArtworkRejected` |
| `src/app/api/email/welcome/route.ts` | 21 | `sendWelcomeEmail` |

Already correctly awaited — do not touch:
- `src/app/api/cron/expire-grace-periods/route.ts:52,89` —
  `sendListingsPaused`, `sendGracePeriodReminder`.

Semantic to preserve in each conversion: email failures must be caught
and logged, never rethrown. The containing handler must keep returning
2xx (or whatever its success shape is) so a Resend-side failure
doesn't cascade into Stripe retries, admin review failure,
order-ship failure, etc.

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

### L5 — Add `stripe_session_id` and `stripe_fee_aud` columns to `orders`

`orders` today carries `stripe_payment_intent_id` (sufficient for
refund + dispute correlation — payment intent is the canonical Stripe
handle) but lacks two handles that would simplify debugging and
reporting:
- `stripe_session_id` — the `cs_…` Checkout Session id. Not required
  for refunds/disputes, but makes it trivial to cross-reference a
  Stripe Dashboard session URL against an order row without doing a
  payment-intent → session lookup.
- `stripe_fee_aud` — the Stripe processing fee per order, in AUD
  dollars. Currently derived at webhook time via
  `calculateStripeFee()` but never persisted. Persisting it allows
  reconciling actual vs calculated fees and auditing payouts without
  recomputing.

Both would be nullable additive columns; no migration risk.

Surfaced 2026-04-22 during smoke-test verification — would have made
the verification table trivially readable rather than requiring
re-derivation from payment intent + total.

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

## Post-launch monitoring

### Stuck reservation monitoring
Set up a daily check (or Vercel cron) that alerts if any artwork
has `status='reserved'` for more than 1 hour. Post-Group-1/2/3
deployment, this should always be zero except during active
checkouts. Any persistent non-zero count means reservation cleanup
is broken.

Query:
```sql
SELECT COUNT(*) FROM artworks
WHERE status = 'reserved'
  AND updated_at < NOW() - INTERVAL '1 hour';
```

Alert via email to admin if count > 0.

Surfaced 2026-04-21 after an abandoned checkout on
signoart.com.au left artwork `74f3803e-4cbf-4365-bcf3-589c2af502a5`
("Untitled #3", $999.97) stuck at `reserved` for ~10 hours until
manual reset. Broken webhook + absent cron meant no auto-recovery.

### Vercel log retention is under 24 hours

Observed 2026-04-22 during the payment-webhook smoke-test
investigation: request logs for deployments older than ~24 hours age
out of Vercel's log UI and the internal
`vercel.com/api/logs/request-logs` endpoint returns empty arrays for
older requests. Anything that needs to persist longer than 24h for
debugging, audit, or compliance MUST live elsewhere.

Today's persistent signals:
- `processed_stripe_events` table — dedup + audit trail for webhook
  deliveries. Survives independently of Vercel log retention.

Candidates to consider for post-launch:
- Ship Vercel function logs to an external service (Logtail, Axiom,
  Datadog, S3 via Vercel log drain).
- Add a lightweight `webhook_events_log` table capturing Stripe event
  id + type + handler outcome, keyed for fast lookup. Extends the
  existing `processed_stripe_events` pattern.
- Structured error table for payment-flow exceptions (email send
  failures, refund failures, transfer failures).

Decision deferred until post-launch when real traffic volume and
debugging patterns are observed.
