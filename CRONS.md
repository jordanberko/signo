# CRONS

Scheduled work for Signo. Four cron jobs run against production on
Vercel's scheduler, defined in [`vercel.json`](vercel.json) and
implemented in `src/app/api/cron/*/route.ts`. Each handler is protected
by `CRON_SECRET` and exports both `GET` (for Vercel Cron) and `POST`
(for manual ops during incidents) — same body, same auth.

This document is the audit trail + verification protocol for the cron
surface. It exists for the same reason [MIGRATIONS.md](MIGRATIONS.md)
exists: three orthogonal bugs silently stacked on this surface at
different layers (auth / method / cadence), all invisible until a live
probe surfaced them, and two of the three had no user-visible signal
whatsoever while broken. Future-you should have enough here to notice
and diagnose faster than we did the first time.

## Audit table

Snapshot of the four production crons vs their business-logic
thresholds, as of 2026-04-24.

| route | schedule | threshold | cadence rationale | last verified |
|---|---|---|---|---|
| [`/api/cron/release-escrow`](src/app/api/cron/release-escrow/route.ts) | `0 * * * *` (hourly) | 48h inspection window ([orders/[id]/deliver/route.ts:54](src/app/api/orders/[id]/deliver/route.ts:54)) | Hourly caps delivery-to-payout at ~49h (48h inspection + ≤1h cron gap). Daily would push to ~72h. | 2026-04-24 (natural fire 00:00:04 UTC, 200) |
| [`/api/cron/cancel-unshipped`](src/app/api/cron/cancel-unshipped/route.ts) | `0 6 * * *` (daily 06:00 UTC) | 7 calendar days ([escrow.ts:344](src/lib/stripe/escrow.ts:344)) | 7-day threshold against daily cron gives ≤8d worst-case cancellation. Tighter cadence has no product value at this threshold. | 2026-04-24 (synthetic Run Now 23:46:48 + 23:47:05 UTC, both 200) |
| [`/api/cron/release-reservations`](src/app/api/cron/release-reservations/route.ts) | `*/5 * * * *` (every 5 minutes) | 10-minute reservation window ([route.ts:39-43](src/app/api/cron/release-reservations/route.ts:39), set 2026-04-22 in a8774f7) | 5-minute cron caps cleanup latency at ≤15m (10m window + ≤5m cron gap). Anything coarser makes the shortened reservation window functionally meaningless — pieces would sit reserved hours after buyer abandonment. Requires Vercel Pro (Hobby caps at once-per-day). | 2026-04-24 (natural fires 23:40-00:05 UTC every 5 min, 6 consecutive 200s) |
| [`/api/cron/expire-grace-periods`](src/app/api/cron/expire-grace-periods/route.ts) | `0 2 * * *` (daily 02:00 UTC) | 14-day grace period ([escrow.ts:144](src/lib/stripe/escrow.ts:144)) | Grace period is measured in days, so per-day granularity is sufficient. Also sends reminder emails to artists 3–5 days out from expiry — same cron, same cadence. | 2026-04-24 (synthetic Run Now 23:47:35 UTC, 200) |

All four verified post-Pro-upgrade on 2026-04-24. Re-verify when any
schedule or handler body changes.

## Verification protocol

### Via Vercel Dashboard (fastest)

1. Project → Crons tab lists all four routes with their schedules and
   last-invocation metadata.
2. Click **Run now** on the target cron. This fires a synthetic
   invocation with the same `Authorization: Bearer $CRON_SECRET`
   header Vercel Cron uses for scheduled fires, so a 200 response
   validates both auth and handler body.
3. Watch the invocation count tick up in the Observability column.
4. **Caveat: Run now can double-fire.** Observed once on
   `cancel-unshipped` (2026-04-24): one click → two `200`
   invocations 17 seconds apart. Cause unclear (rapid retry,
   dashboard bug, double-click). Handlers are idempotent by design
   so this doesn't regress anything, but don't be confused if the
   count increments by 2.

### Via CLI (authoritative, scriptable)

Two modes, each with a specific use case.

**Mode A — recent history (non-follow)**. Use for verification after a
deploy, post-hoc incident investigation, or confirming a specific fire
succeeded. Returns HTTP summary rows (with `responseStatusCode`) and
the handler's final `console.log` merged into a single row per request.

```sh
vercel logs --environment=production --branch=main --since=15m \
  --limit=500 --json
```

Parse the JSON lines and filter on `requestPath` starting with
`/api/cron/`. Deduplicate by `id` — the CLI sometimes emits the same
row up to 10× in a single JSON stream (a display artefact, not real
duplicate traffic). Example dedup in Python:

```python
import json
seen = {}
for line in open("/tmp/logs.json"):
    line = line.strip()
    if not line.startswith("{"): continue
    r = json.loads(line)
    if "/api/cron/" in r.get("requestPath", ""):
        seen[r["id"]] = r
```

**Mode B — live stream (follow)**. Use for watching a deploy land and
confirming the next scheduled fire works. Streams handler `console.log`
lines in near-realtime. Has three quirks that bit us once each:

- `--follow` is mutually exclusive with `--environment` and `--limit`.
  Filter inside your own pipeline instead.
- `--follow` has a hard 5-minute duration cap. The process exits with
  code 1 and `"WARNING! Exceeded query duration limit of 5 minutes"`.
  For longer watches, restart the stream or fall back to Mode A.
- `--follow` only emits **handler log rows** (`console.log` / console.error
  output). Those rows have `responseStatusCode: -1` and no HTTP method
  verification. For status-code-level confirmation, use Mode A.

Pin to the production deployment URL explicitly — without `--environment`
filtering the CLI auto-detects based on the current git branch, which
can resolve to a preview deployment that never fires crons:

```sh
vercel logs https://signo-<hash>-jordanberkos-projects.vercel.app \
  --follow --json
```

### Quirks worth remembering

- **Vercel Cron invokes via the per-deployment URL** (e.g.
  `signo-<hash>-jordanberkos-projects.vercel.app/api/cron/release-escrow`),
  not the canonical alias (`signoart.com.au`). Log entries from cron
  fires will have `domain` set to the deployment host. If you're
  grepping for cron traffic against `signoart.com.au`, you'll see
  nothing — those hits are external (smoke probes, operator curl,
  etc.), not Vercel Cron.
- **Schedule jitter is ~10 seconds**. A `*/5 * * * *` cron fires at
  `:X5:10` UTC, not `:X5:00`. A `0 * * * *` cron fires at `:00:04` in
  the hour we measured. Expected Vercel behaviour; don't chase it.
- **Vercel Cron auto-injects `Authorization: Bearer $CRON_SECRET`**
  when `CRON_SECRET` is set in the production environment. No code
  change needed in the route — the handler's standard auth check
  works. If `CRON_SECRET` is unset, every fire 401s silently.

## Retrospective — three compounding bugs + one config-rejection incident

On 2026-04-23 a cron-invocation audit surfaced three orthogonal bugs
stacked on the same surface. Each was silent to the user. Each was
dependent on the others being fixed first to produce any visible
change. Fixing any one in isolation would have kept 100% of
invocations failing, just at a different layer. A fourth incident —
config-rejection on the cadence fix attempt — is included because its
diagnostic signal was genuinely confusing and worth documenting for
next time.

### Bug 1 — Auth layer: `CRON_SECRET` missing on Production scope

Every cron handler guards with:

```ts
if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

`CRON_SECRET` was set on Preview scope (for the
`group-1-security-fixes` branch) but never on Production. Vercel Cron
fires on prod, reads `$CRON_SECRET` from the prod environment, gets
`undefined`, injects nothing as the Bearer token, and the guard
short-circuits to 401 on every single invocation. No Sentry, no
alerting, no dashboard metric flagged "auth failure rate: 100%". The
only visible signal was that orders weren't auto-releasing, artworks
weren't auto-un-reserving, and grace-period reminders weren't going
out — none of which were loud enough to surface for an unlaunched
marketplace.

Fix: set `CRON_SECRET` on Production scope (done 2026-04-23 during
Blocker 4 investigation).

### Bug 2 — Method layer: routes exported POST only, Vercel Cron uses GET

Even with `CRON_SECRET` correctly set, every cron fire still failed —
now at a layer earlier than auth. Vercel Cron invokes with `GET`, not
`POST`. All four routes declared only `export async function POST`, so
Next.js returned `405 Method Not Allowed` before the handler body (and
therefore before the auth check) ever ran. Setting `CRON_SECRET` alone
would have moved the failures from 405 to... still 405. Nothing would
have worked.

This was invisible because `405` on a cron endpoint looks identical to
`401` looks identical to `200` from any dashboard that only counts
invocations-per-route and ignores status codes. Vercel's Observability
page shows invocation counts but the 4xx breakdown is one extra click.

Fix: extract each POST handler body into a private `handler()`
function, export both `GET` and `POST` wrappers that delegate to it
(Commit 8bf6e82). GET is what Vercel Cron hits; POST stays for manual
`curl -X POST` during incident response.

### Bug 3 — Cadence layer: schedule vs business-logic drift

The third bug was the schedules themselves. The routes had comments
claiming their intended cadence (release-escrow: "every hour";
release-reservations: no explicit comment but a 10-minute reservation
window in the handler body) while [`vercel.json`](vercel.json)
declared daily schedules for both.

- `release-escrow` at `0 0 * * *` against a 48-hour inspection window
  meant delivery-to-payout could stretch to ~72h (48h inspection + up
  to ~24h cron gap). The doc-comment "every hour" was correct intent;
  the schedule was wrong.
- `release-reservations` at `0 3 * * *` against a 10-minute reservation
  window (shortened from 30m in a8774f7, 2026-04-22) meant an
  abandoned checkout could hold an artwork hostage for up to ~24
  hours. This actively defeated the product decision to shorten the
  reservation window — liquidity improvement that never reached prod.

Fix: `vercel.json` schedules to `0 * * * *` (hourly) and `*/5 * * * *`
(every 5 minutes) respectively, Commit 8cb3b1b.

### Incident — Hobby tier rejected the cadence fix with a confusing signal

Commit 8cb3b1b merged to main cleanly. GitHub showed the Vercel commit
status flip to `failure` with `"description": "Deployment failed"`
and a target URL `https://vercel.link/3Fpeeb1` that 301-redirected to
`https://vercel.com/docs/cron-jobs/usage-and-pricing`. No build log
was created. No deployment ID appeared in `vercel ls`. The live prod
deploy remained the previous commit.

The diagnostic confusion: **the failure happened at config validation,
before the build started**. Vercel's scheduler parses `vercel.json`
cron entries at deploy-request time, compares the frequencies against
the project's plan tier, and rejects the whole deploy if any schedule
exceeds the tier limit. On Hobby, the limit is "once per day" — our
`0 * * * *` and `*/5 * * * *` entries both violated it.

The signal pattern worth remembering:

- GitHub commit status: `failure`, `description: "Deployment failed"`.
- Vercel target URL: shortlink that redirects to a **docs page**, not
  a deployment-logs page. If the URL resolves to `/docs/...`, the
  deploy was rejected at config validation, not build.
- `vercel inspect --logs <sha>`: "Can't find the deployment" — no
  deployment record exists.
- `vercel ls`: no entry for the SHA, not even a failed one.
- No build log accessible anywhere. This is the confusing bit —
  build-failure runbooks assume a log exists.

Resolution path when you see this:

1. Follow the shortlink. The destination docs page names the specific
   limit that was violated.
2. Either revert the offending change, split it across deploys (if
   some part is independently viable), or upgrade the plan.

In our case: reverted to daily schedules same-evening (Commit 72b3bae)
to unblock the ship, upgraded to Vercel Pro overnight, re-applied the
schedule changes the next morning (Commit 99418a6) where they deployed
cleanly.

### Why all three were invisible at once

A surface where the user-facing feature is "things happen in the
background on a schedule" produces no user-facing error when the
schedule doesn't run. Buyers don't know they should have been paid out
two days ago. Artists don't know their auto-paused listings weren't
actually paused. The only observers are the operators, and the
operators were watching the dashboards-as-configured, which only
counted invocations (the 405s were logged as invocations) without
decomposing by status code.

The general lesson: anywhere the signal-of-success is "code ran"
rather than "user saw something change", the monitoring has to probe
the actual side-effect, not just the invocation count. The migration
audit in [MIGRATIONS.md](MIGRATIONS.md) is the same class of problem —
pasted SQL that didn't paste produced no user signal — and this is why
both docs exist.

## Operator notes

### Adding a new cron

1. Create the route file at `src/app/api/cron/<name>/route.ts`. Use
   the shared shape: a private `handler(request)` function that does
   the auth check + business logic, plus `export async function GET` /
   `export async function POST` wrappers that call it. Copy from any
   existing cron route — they're identical outside their bodies.
2. Add the schedule entry to [`vercel.json`](vercel.json) `crons` array.
3. Append a row to the audit table above with the schedule, business-
   logic threshold, cadence rationale, and a placeholder
   `last verified` date.
4. Merge to `main`. Vercel auto-deploys. The first scheduled fire will
   happen at the cron's next matching time.
5. Verify via one of the protocols above. Populate the `last verified`
   date with the confirmation timestamp.

### Verifying a schedule change is tier-compatible

- **Hobby**: one fire per day maximum per cron. Any schedule finer
  than daily fails config validation.
- **Pro**: down to once per minute (`* * * * *`). 100 cron jobs per
  project cap.
- **Enterprise**: same cap as Pro (100). Tier matters mostly for
  per-invocation cost and support SLAs at this point, not scheduling.

Concretely for us: as of 2026-04-24 the project is on Pro. The Pro
upgrade is the prerequisite for `release-escrow` hourly and
`release-reservations` every-5-minute schedules — both were reverted
to daily on Hobby for one evening (72b3bae) and re-applied the
following morning on Pro (99418a6).

If a schedule change breaks the tier limits, Vercel will reject the
deploy with the docs-redirect signal pattern described in the
retrospective above. Before proposing sub-daily schedules, confirm the
project is on Pro or higher.

### Rotating `CRON_SECRET`

- Generate a new secret (`openssl rand -base64 32`).
- Update the `CRON_SECRET` env var on Production scope (and any
  branch-scoped Preview overrides that depend on it).
- Redeploy — crons will pick up the new secret on the next fire.
- Mark Sensitive in Vercel so it doesn't leak to `vercel env pull`
  by default.

### Firing a cron manually during an incident

```sh
curl -X POST https://signoart.com.au/api/cron/<name> \
  -H "Authorization: Bearer $CRON_SECRET"
```

POST is kept alongside GET on every route for exactly this case. The
handler ignores method. Auth header must be present and correct —
unauthenticated hits return 401.

### Pause all crons for a maintenance window

`vercel.json` is the authoritative source. Either comment out the
entries (JSON doesn't support comments — use a separate branch and
revert when done), or temporarily move them to an ignored path by
renaming the cron route file. Vercel picks up the change on next
deploy; crons with no matching route return 404 and Vercel stops
retrying.

Prefer the rename approach for short pauses — it leaves the audit
trail intact and the revert is one `git mv` away.
