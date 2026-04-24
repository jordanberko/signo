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

**Status 2026-04-24:** no change to cutover scope. The Vercel Pro
upgrade (2026-04-24) doesn't affect live-mode readiness — it unlocked
sub-daily cron schedules and password-protected previews, neither of
which gate the cutover. All pre-launch test-mode env-var plumbing is
in place and proven end-to-end; the flip follows the checklist below
once every other pre-launch blocker is closed.

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

### CRITICAL — Fire-and-forget Resend sends at 6 remaining call sites (M6)

**Elevated from Medium to pre-launch blocker 2026-04-24.** Same class
of silent-email-failure risk that caused the 2026-04-22 smoke test to
appear successful while zero emails delivered (see "Resend domain
verification — RESOLVED" below for that incident's parallel cause).

The payment webhook was fixed in `bca8579` — its two calls to
`sendOrderConfirmation` and `sendNewSaleNotification` are now awaited
inside try / catch. The same fire-and-forget pattern exists at 6
other call sites. Under Vercel's serverless Node runtime, unawaited
HTTP requests can be severed the moment the handler returns,
silently dropping emails.

Call sites to convert — same mechanical change in each:
`sendFoo({…}).catch((err) => console.error(…))` →
`try { await sendFoo({…}) } catch (err) { … }`:

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

Semantic to preserve in each conversion: email failures must be
caught and logged, never rethrown. The containing handler must keep
returning 2xx (or whatever its success shape is) so a Resend-side
failure doesn't cascade into Stripe retries, admin review failure,
order-ship failure, etc.

Rationale for pre-launch classification: post-launch, a silent email
drop on order confirmation or payout notification erodes buyer /
artist trust with no operator-visible signal. Same shape of risk as
silent SQL drift (now tripwired by `migrations:check`) and silent
cron drift (now documented in [CRONS.md](CRONS.md)). M6 is the
equivalent tripwire for email-send paths — either convert to awaited
sends, or build a send observer that alerts on drop.

### Resend domain verification — RESOLVED 2026-04-23

**Status 2026-04-23: RESOLVED.** `signoart.com.au` is verified in
Resend; live payment-webhook smoke test on 2026-04-23 confirmed both
buyer and artist emails deliver end-to-end. DNS records (SPF, DKIM,
DMARC) landed via the Vercel nameserver migration. No commit — the
fix was operator actions in the Resend Dashboard and the DNS
provider.

Original context retained for history: the domain was the second of
two compounding causes of the 2026-04-22 email-drop incident. Cause
(a), fire-and-forget promise termination in the handler, was fixed
for the payment-webhook path in `bca8579` — **the same pattern still
affects 6 other call sites, elevated to the pre-launch-blocker
section above as M6 (CRITICAL)**.

### Migration apply workflow gap — RESOLVED 2026-04-23

**Status 2026-04-23: RESOLVED.** [MIGRATIONS.md](MIGRATIONS.md) is the
authoritative process doc; `scripts/verify/migrations-applied.mjs`
(invoked as `npm run migrations:check`) is the automated tripwire.
Every `supabase/migrations/*.sql` file has a probe registered; every
migration's apply date is tracked in the audit table. Commits:
`d1f2ff0` (tripwire + doc), `4bfdb4a` (drift cleared for 006 + 012),
`8699f48` (reverse drift codified as migration 019).

**Retrospective — 006 + 012 drift pattern** (full write-up in
[MIGRATIONS.md](MIGRATIONS.md) § "Incident retrospective"):

- **006** (`contact_messages` + `newsletter_subscribers`): committed 2026-04-07, applied 2026-04-23 — 16 days of silent 500s on contact + newsletter.
- **012** (`profiles.subscription_status` + 2 sibling columns): committed 2026-04-12, applied 2026-04-23 — 11 days of silent PGRST 400s across subscription webhook, browse, escrow.
- **Reverse drift**: 4 `profiles` columns existed in prod with no migration file; codified as 019.
- Shared root cause: Dashboard paste without verification, generic 500 handlers masking the PGRST codes.

Follow-up remaining open: **operator SQL path** for privileged seed
/ repro operations that need to bypass the BEFORE-UPDATE
`set_updated_at_artworks` trigger (PostgREST service-role can read
through RLS but not through BEFORE triggers). Tracked as M7 below;
subsumes the "no operator SQL path" concern surfaced 2026-04-22
during end-to-end release-reservations verification.

### Architectural — Webhook endpoint URL hardcoded to prod — RESOLVED 2026-04-23

**Status 2026-04-23: RESOLVED.** Both Stripe webhook endpoints now
point at `signoart.com.au` (payment webhook
`we_1THAZfAFoloYAF9YCSozHoTi`, subscription webhook
`we_1THAVeAFoloYAF9YzG1hqnc4`). The Stripe Dashboard flip was an
operator action, not a commit. Parallel code-side work in commits
`6eabdc8` + `006bc43` extracted [src/lib/urls.ts](src/lib/urls.ts)
`appUrl()` as the single source of truth for deployment URL
resolution (production / preview / dev), so no call site hard-codes
a host any more.

Preview webhook testing continues to use the
`x-vercel-protection-bypass=<token>` header pattern documented in
the webhook testing runbook above — by design, not residual work.

### Vercel Deployment Protection — RESOLVED 2026-04-23 (non-issue in current config)

**Status 2026-04-23: RESOLVED.** Blocker 4 investigation confirmed
the current Vercel config serves webhook traffic correctly by
design: Production has no Deployment Protection (webhooks land
directly on the handler), Preview is protected (intentional — no
webhook testing from third parties is expected on preview URLs
without the documented bypass pattern). No code change, no Vercel
config change required. Operator actions landed same day:
`NEXT_PUBLIC_APP_URL` + `CRON_SECRET` set on Production scope
(previously missing; silent failure surfaced during the same
investigation).

Rationale for keeping Production unprotected: webhook sources
(Stripe, Resend, any future integration) must POST without passing
the Vercel SSO gate. The documented
`x-vercel-protection-bypass=<token>` pattern remains valid for the
rare case of preview webhook testing — see "Webhook testing runbook"
above.

The full "why prod Deployment Protection is off" write-up is
tracked as VL1 below to prevent a future operator from "fixing" an
intentional config.

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

### M6 — Elevated to pre-launch blocker 2026-04-24

See `CRITICAL — Fire-and-forget Resend sends at 6 remaining call
sites (M6)` in the Pre-launch blockers section above. Placeholder
kept here so the M6 identifier remains discoverable in this section;
the active tracking lives with the other pre-launch blockers.

### M7 — Full schema audit via direct Postgres introspection

Motivated by the 2026-04-23 reverse-drift finding — four `profiles`
columns existed in prod with no matching migration file. The current
probe (`npm run migrations:check`) only detects missing tables,
columns, and storage buckets via PostgREST; it cannot see RLS
policies, CHECK constraints, triggers, functions, or indexes that
exist in prod without a committed migration.

Once `DATABASE_URL` is set in `.env.local` (per
[MIGRATIONS.md](MIGRATIONS.md) § "Operator SQL path"), run a one-off
audit:

- `pg_policies` vs declared RLS policies in `supabase/migrations/*.sql`
- `pg_trigger` vs declared triggers
- `pg_proc` vs declared functions (stored procedures)
- `pg_indexes` vs declared `CREATE INDEX` statements
- Full column list per table vs declared `ADD COLUMN` / `CREATE TABLE`

Goal: detect any structural drift the PostgREST probe misses. Output
is a one-off drift report; persistent probing can come later if the
one-off finds meaningful drift.

Also subsumes the "no operator SQL path" concern folded into the
Migration apply workflow gap section above — running this audit is
itself the privileged-operator path, and requires the same
`DATABASE_URL` plumbing.

### M8 — Newsletter upsert vs RLS policy mismatch (user-facing 500)

`src/app/api/newsletter/route.ts` calls
`supabase.from('newsletter_subscribers').upsert(..., { onConflict:
'email' })`. PostgREST translates this to
`INSERT ... ON CONFLICT DO UPDATE`, which Postgres requires UPDATE
privilege for even when no conflict actually occurs. Migration 006
only grants an `INSERT` policy on this table, so every anonymous
subscribe attempt returns `42501 "new row violates row-level
security policy"` which the endpoint maps to a generic HTTP 500.

Hidden for 16 days by the 006 drift (table didn't exist — different
failure path). Surfaced the moment the table came into existence on
2026-04-23.

Two fix paths:
- (a) Swap `.upsert()` for plain `.insert()` and handle the 409
      duplicate-email case client-side. Simpler — the idempotent
      "already subscribed" behaviour is naturally a client-side UX
      concern.
- (b) Add a narrow `UPDATE` policy on `newsletter_subscribers` so
      the upsert ON CONFLICT path is authorised. More code, more
      surface area in the RLS review.

Recommend (a). Full context:
[MIGRATIONS.md](MIGRATIONS.md) § "Residual follow-ups — Newsletter
upsert".

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

### L6 — Dev-scope `RESEND_FROM_ADDRESS` re-add

Currently unset on Vercel Development scope after the 2026-04-23 env
var work. Not blocking — Development scope only runs locally — but
violates the pattern of "every env var has the same shape across
Production, Preview, and Development, or is documented why it
doesn't". Re-add at Development scope matching the Production value.

### L7 — Branch-scoped `NEXT_PUBLIC_APP_URL` override cleanup

The `group-1-security-fixes` branch-scoped override on Vercel Preview
becomes dormant scaffolding once that branch merges and deletes.
Remove from Vercel env after merge. Preview deployments of other
branches will then cleanly fall through to `appUrl()`'s `VERCEL_URL`
branch per the resolution order at [src/lib/urls.ts](src/lib/urls.ts).

### L8 — Payment webhook 80% historical error rate audit

Stripe Dashboard → Webhooks → `we_1THAZfAFoloYAF9YCSozHoTi` showed
12 failed / 15 total events for the week as of 2026-04-23. Most
predate the 2026-04-22 test-mode env-var fix (`bca8579`), the
2026-04-23 URL flip from `signo-tau.vercel.app` to `signoart.com.au`,
and the 2026-04-23 fire-and-forget fix. Worth a one-off click-through
of the failed-event list to confirm the remaining failures are all
from historical test-mode state, not an ongoing code issue we haven't
noticed.

### L9 — `NEXT_PUBLIC_APP_URL` Sensitive toggle off

On Vercel Production scope, `NEXT_PUBLIC_APP_URL` was accidentally
saved with Sensitive=ON on 2026-04-23. Functionally fine — the value
still resolves at build time — but hides the value from
`vercel env pull` output, which breaks the pattern used in
[scripts/verify/migrations-applied.mjs](scripts/verify/migrations-applied.mjs)
and any future operator tooling that pulls env and inspects values.
Toggle Sensitive=OFF in Dashboard → Project → Settings → Environment
Variables, edit the row.

## Very Low

### VL1 — Document Deployment Protection prod-off strategy

Production has no Vercel Deployment Protection by design — webhooks
from Stripe (and any future integration) must POST directly to
handlers without passing the Vercel SSO gate. Preview deployments
are protected, and the `x-vercel-protection-bypass=<token>` pattern
is the documented workaround for rare preview webhook testing (see
"Webhook testing runbook" above).

Current state is correct but undocumented outside TODO.md entries.
Add a short `DEPLOYMENT.md` or similar at repo root covering: what
Deployment Protection is, why prod is off, why preview is on, how
the bypass pattern works, how to verify the current state. Intent:
prevent a future operator from "fixing" an intentional config.

### VL2 — Vercel env var scoping convention — retain `RESEND_FROM_ADDRESS` typo as reference example

The 2026-04-22 incident — `RESEND_FROM_ADDRESS` set to
`Signo <noreply@signo.com.au>` (missing `art`) — is a useful
reference example of the Vercel env var scoping / typo failure mode.
Same-day fix already landed; keep this in reminder form for when the
"Vercel env var convention enforcement" work eventually happens
(originally surfaced 2026-04-22 during the webhook signing-secret
root-cause analysis). Canonical convention-doc home is TBD — likely
alongside `DEPLOYMENT.md` or `OPERATIONS.md`.

Candidate convention: "all new env vars that affect prod runtime
code MUST be added at Production scope at creation time, not just
Preview; CI or a pre-push hook should flag `process.env.FOO`
references whose corresponding Vercel var is missing from Production
scope." Scope reminder: the Preview-only-scoping failure mode caused
the original Production Stripe env vars blocker; re-occurrence
likelihood compounds with each additional env var the project adds.

### VL3 — `CRON_SECRET` rotation post-session

The current `CRON_SECRET` value has been visible across terminal
history and chat context during the 2026-04-23 Vercel Pro / cron
re-enable work. Not actively compromised, but good hygiene before
live-mode launch. Procedure:

1. Generate new secret: `openssl rand -base64 32`.
2. Update on Vercel Production scope (mark Sensitive=ON this time).
3. Redeploy to pick up the new value.
4. Verify via `vercel logs` after the next scheduled cron fire:
   expect 200, not 401.

Full procedure documented in [CRONS.md](CRONS.md) § "Rotating
`CRON_SECRET`".

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

## Dated reminders

### DR1 — 2026-06-07: Vercel Pro evaluation gate

Six-week review of the Vercel Pro upgrade (made 2026-04-24,
$20/month). Decision criteria — if any of these is YES, Pro stays;
if all are NO, downgrade to Hobby and migrate the two sub-daily
crons to GitHub Actions:

- Have we used the sub-daily cron schedules (`release-escrow`
  hourly, `release-reservations` every 5 min) in a way that produced
  measurable product value — faster payouts, more liquid
  reservation releases, measurable drop in stuck-reservation
  incidents?
- Has the longer log retention window (Pro vs Hobby's 24h) caught
  at least one real incident we couldn't have caught on Hobby?
- Have we needed password-protected previews for client /
  stakeholder review?
- Have we hit Hobby serverless limits on any real traffic spike?

If downgrading: the two schedules that require Pro
(`release-escrow 0 * * * *`, `release-reservations */5 * * * *`,
per [vercel.json](vercel.json)) would move to `schedule:` entries
in a `.github/workflows/cron.yml` workflow, hitting the same HTTPS
endpoints with `Authorization: Bearer $CRON_SECRET`. Handler
contract is unchanged — the routes already accept both GET and POST
(see [CRONS.md](CRONS.md) § "Operator notes").
