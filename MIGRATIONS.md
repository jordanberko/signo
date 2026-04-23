# MIGRATIONS

Database schema changes for Signo. Migrations live in `supabase/migrations/`,
numbered sequentially (`000_`, `001_`, …). Each file is applied exactly once,
in order, to every environment (dev, preview, prod).

There is no automated apply pipeline today. Migrations are applied by hand
via the Supabase Dashboard SQL Editor or `psql` (see Operator SQL below).
Applying by hand works but is fragile, and on 2026-04-23 a live probe of
every migration artefact against prod surfaced two independent drift events
that had been running silently for days:

- **006_contact_and_newsletter** (16 days unapplied, 2026-04-07 → 2026-04-23):
  contact form and newsletter signup were returning HTTP 500 every time.
- **012_artist_subscription_lifecycle** (11 days unapplied, 2026-04-12 →
  2026-04-23): `profiles.subscription_status` and two sibling columns
  missing, leaving the browse / spotlight / dashboard queries that filter on
  subscription state hitting a column-does-not-exist error.

The same probe also surfaced **reverse drift**: four columns live on
`profiles` in prod (`city`, `country`, `postcode`, `street_address`) that
appear in no committed migration file. They are hand-added via Dashboard,
read and written by `src/app/api/profile/route.ts`, and have been carrying
real user data. Migration `019_profile_structured_address.sql` codifies
their current prod shape so future environments and the probe registry
agree with reality.

This document + `scripts/verify/migrations-applied.mjs` are the tripwire
that prevents forward or reverse drift recurring.

## Authoritative order & apply rules

- Files run in numeric order, exactly once per environment.
- All `CREATE`s use `IF NOT EXISTS`; all `ALTER`s use `IF EXISTS` /
  `IF NOT EXISTS`; re-applying a migration is a no-op.
- Every numbered file committed to `main` must be live in every
  environment before the commit is considered deployed. If you can't
  apply yet, don't merge.
- No skipping numbers. No editing or deleting an already-applied file.
  To revert or fix, ship `NNN+1_revert_XYZ.sql`.

## Before-merge procedure for a new migration

1. Write it in `supabase/migrations/NNN_brief_name.sql`. Use the lowest
   unused number. Prefer `IF NOT EXISTS` / `IF EXISTS` for idempotency.
2. Dry-run it against your local or staging Supabase project via SQL
   Editor, or via `psql $DATABASE_URL` (see Operator SQL).
3. Register a probe for it in `scripts/verify/migrations-applied.mjs` —
   one entry keyed by filename, pointing at a table / column / storage
   bucket the migration creates.
4. Before merge, apply it to **prod** via Supabase Dashboard SQL Editor
   (or `psql $DATABASE_URL -f supabase/migrations/NNN_*.sql`).
5. Run `npm run migrations:check` — must print
   `OK: all migrations verified against prod.`.
6. Append a row to the audit table below with the apply date.
7. Commit everything together (migration file + probe entry + audit row).

If the migration *must* ship with an app-code change (new table the app
immediately reads from), apply to prod **before** the code deploy.
Otherwise the deploy goes out referencing a table that doesn't exist yet.

## Verification script

```
npm run migrations:check
```

What it does:

- Reads `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`.
- Walks `supabase/migrations/*.sql`, looks up each file in the PROBES
  registry, and hits the Supabase REST (or Storage) API for its signal
  artefact.
- Prints a table of APPLIED / MISSING / SKIP per migration.
- Exits 0 only if every non-structural migration is APPLIED and every
  file has a registered probe.

When to run:

- Before every deploy.
- Immediately after pasting a new migration in Dashboard / running
  `psql -f`, as a sanity check.
- Whenever prod is 500ing and you suspect drift.

### Current limitations (tracked as TODO.md Low)

The probe knows whether a table exists, whether a column exists, and
whether a storage bucket exists. It does **not** verify:

- RLS policies (migrations 004, 005)
- CHECK constraint values (migration 017)
- FK cascade behaviour (migration 009)
- Triggers

Those migrations are tagged `structural` in the registry and skipped.
Planned pass-2: probe `pg_policies` and `pg_trigger` via direct `psql`
against `DATABASE_URL` from the operator's laptop. Until that exists,
trust `structural` migrations on the same basis as the initial apply
(i.e. "I pasted it and ran it; no SQL error").

## Operator SQL path (laptop only — not Vercel)

For one-off privileged SQL — backdating a column to repro a bug,
disabling a trigger during a test, forcing a data fix — use direct
`psql` against the prod database. **`DATABASE_URL` lives on operator
laptops only.** Never put it in Vercel env (any runtime code reading it
would bypass RLS for every user request).

### Get the connection string

1. Supabase Dashboard → Settings → Database → Connection string.
2. Copy the **Direct connection** URL. Port **5432**.
3. **Do not** use the Transaction or Session Pooler (port 6543). The
   pooler breaks interactive `psql`: session variables, prepared
   statements, and `\d` introspection all fail against it.
4. Format: `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require`.
5. Paste into `.env.local` as `DATABASE_URL=...`. `.env.local` is
   gitignored; keep it that way.

### Usage

```sh
psql "$DATABASE_URL"                                # interactive
psql "$DATABASE_URL" -c '\d orders'                 # describe a table
psql "$DATABASE_URL" -f supabase/migrations/NNN.sql # apply one migration
psql "$DATABASE_URL" -c "SELECT count(*) FROM profiles WHERE role = 'artist';"
```

### Boundaries

- **Never** mirror `DATABASE_URL` to Vercel Preview or Production. Dev /
  Preview / Production app runtimes use PostgREST via the service-role
  key, which enforces RLS (mostly) and has a narrower blast radius.
- **Never** commit `DATABASE_URL` to the repo or paste it in chat /
  issues / PRs. Treat it like a root password.
- Prefer Supabase Dashboard SQL Editor for day-to-day migration apply —
  it leaves an in-product audit trail and is easier to screenshot for
  teammates. `psql` is the power tool for operator SQL and migration
  script automation, not the default path for schema changes.

## Rollback stance

- Postgres migrations are forward-only. No automated rollback.
- Each new migration must either:
  - be idempotent and reversible with a documented counter-migration
    (preferred), or
  - be explicitly one-way (type drops, destructive data transforms).
- To revert an applied change, write `NNN+1_revert_XYZ.sql` that
  undoes the previous change. Never edit an already-applied file.

## Audit table

Snapshot of every migration vs the live `signoart.com.au` Supabase
project (`xmuoqfaaxafmmbylgrwg`). Apply dates are best-effort; where
only the commit date is known, that's used on the assumption that the
file was pasted into the Dashboard the same day. Drift events are
called out explicitly.

| # | File | Applied to prod | Notes |
|---|------|-----------------|-------|
| 000 | `cleanup_old_schema.sql` | on or before 2026-03-30 | structural (drops only) |
| 001 | `initial_schema.sql` | 2026-03-30 | profiles / artworks / orders / disputes / reviews / messages |
| 002 | `add_onboarding_completed.sql` | 2026-03-30 | |
| 003 | `subscriptions.sql` | 2026-03-31 | |
| 004 | `admin_rls_policies.sql` | 2026-04-01 | structural (RLS) — probe can't verify |
| 005 | `fix_profiles_rls_recursion.sql` | 2026-04-06 | structural (RLS) — probe can't verify |
| **006** | **`contact_and_newsletter.sql`** | **NOT APPLIED (as of Commit 1 of this work — pending Dashboard paste today)** | **committed 2026-04-07. See Incident retrospective.** |
| 007 | `conversations_messages.sql` | 2026-04-07 | |
| 008 | `favourites.sql` | 2026-04-07 | |
| 009 | `artwork_fk_set_null.sql` | 2026-04-08 | structural (FK cascade) |
| 010 | `is_featured.sql` | 2026-04-09 | |
| 011 | `avatars_storage.sql` | 2026-04-09 | storage bucket + policies |
| **012** | **`artist_subscription_lifecycle.sql`** | **NOT APPLIED (as of Commit 1 of this work — pending Dashboard paste today)** | **committed 2026-04-12. See Incident retrospective.** |
| 013 | `new_artwork_fields.sql` | 2026-04-14 | adds `availability`, `colors`, `surface`, etc. |
| 014 | `follows.sql` | 2026-04-14 | |
| 015 | `commissions_notifications_trade.sql` | 2026-04-14 | `artwork_notifications` + `trade_enquiries` |
| 016 | `collections_studio_analytics.sql` | 2026-04-14 | collections, studio_posts, analytics tables |
| 017 | `add_reserved_status.sql` | 2026-04-22 | structural (CHECK constraint) |
| 018 | `processed_stripe_events.sql` | 2026-04-22 | webhook idempotency table |

## Incident retrospective — migrations 006 + 012 drift (pattern)

The 2026-04-23 Blocker 2 investigation turned up not one but two
independent drift events sitting in prod, plus a reverse-drift case.
They share a single root cause: **manual Dashboard-paste migrations
with no verification tripwire silently drift from the repo**. One
missed paste and the repo and prod disagree for as long as nobody
happens to exercise the affected code path in a way that surfaces.

### Instance 1 — migration 006 (forward drift, 16 days)

- **2026-04-07**: `006_contact_and_newsletter.sql` committed. Matching
  app code (`src/app/api/contact/route.ts`,
  `src/app/api/newsletter/route.ts`) committed in the same window and
  began running in prod. Neither table existed in prod Supabase.
- **2026-04-07 → 2026-04-23**: 16 days of HTTP 500 on every contact
  submission and every newsletter signup. PostgREST returned
  `PGRST205 "Could not find the table 'public.contact_messages'"`;
  the app-level handler swallowed it and returned a generic
  `{ error: 'Failed to send message. Please try again.' }`. No
  alerting, no Sentry, no log-based monitoring caught it.
- **2026-04-23**: the live-probe script identified
  `contact_messages` and `newsletter_subscribers` as missing. Applied
  via Supabase Dashboard SQL Editor the same day; migrations:check
  flipped `MISSING` → `APPLIED`; `POST /api/contact` and
  `POST /api/newsletter` confirmed returning 200.

### Instance 2 — migration 012 (forward drift, 11 days)

- **2026-04-12**: `012_artist_subscription_lifecycle.sql` committed,
  adding `profiles.subscription_status` (TEXT NOT NULL DEFAULT 'trial'),
  `grace_period_deadline` (TIMESTAMPTZ), `first_sale_completed_at`
  (TIMESTAMPTZ), plus a CHECK constraint and an index on
  `subscription_status`.
- **2026-04-12 → 2026-04-23**: 11 days where `subscription_status` did
  not exist in prod. Every query that filters or reads this column
  — `/api/artworks/browse`, `/api/artworks/featured`,
  `/api/artists/spotlight`, `/api/artist/dashboard`,
  `/api/cron/expire-grace-periods`, the Stripe subscription webhook,
  the settings / subscribe / dashboard pages — was issuing a query
  against a non-existent column, returning PostgREST 400s.
- **2026-04-23**: same live-probe pass flagged
  `col:profiles.subscription_status` as `MISSING`. Applied via
  Dashboard the same day.

### Reverse drift — four undocumented columns on `profiles`

The same audit surfaced `city`, `country`, `postcode`, and
`street_address` living on `profiles` in prod with no matching migration
file. They are actively read and written by
`src/app/api/profile/route.ts` and have real user data in them (e.g.
one profile has a full address filled in; all three profile rows have
`country` populated via its `DEFAULT 'Australia'`). They were
presumably hand-added via the Dashboard without the matching commit.

Current prod shape (as queried via the service-role OpenAPI spec):

| column | type | nullable | default |
|---|---|---|---|
| `city` | text | yes | — |
| `country` | text | yes | `'Australia'` |
| `postcode` | text | yes | — |
| `street_address` | text | yes | — |

These are codified forward in a new migration
`019_profile_structured_address.sql` (Commit 3 of this work), using
`ADD COLUMN IF NOT EXISTS` so the apply is a no-op against prod and
creates the columns correctly in fresh dev / preview databases.

### Root cause (shared)

Migrations are applied to prod by manual Dashboard paste. Before this
work there was no tripwire comparing files in `supabase/migrations/` to
artefacts live in prod. Forgetting to paste a file (006) or pasting
something out-of-band without a committed file (the four address
columns) both drifted prod from the repo without anyone noticing.
Error handlers that return generic user-facing messages rather than
logging the underlying PGRST code made the forward drift invisible in
runtime logs.

### Fix

- This document defines the convention and before-merge procedure.
- `scripts/verify/migrations-applied.mjs` is the automated tripwire.
  `npm run migrations:check` must return OK before every deploy.
- Migrations 006 and 012 applied to prod via Dashboard; verified by
  re-running `migrations:check` and re-testing affected endpoints.
- Migration 019 codifies the four reverse-drifted address columns.

### Residual follow-ups (tracked as TODO.md Low)

- Probe RLS / CHECK / trigger / policy / function drift via
  `pg_policies` / `pg_trigger` / `pg_proc` / `pg_indexes` using
  `psql $DATABASE_URL` — the current PostgREST-based probe misses
  these, and four undocumented columns on `profiles` is evidence there
  could be other undocumented objects (policies, triggers, functions)
  we haven't caught yet. Run a full schema audit once DATABASE_URL is
  set locally.
- The generic 500 error handlers in `src/app/api/contact/route.ts` and
  `src/app/api/newsletter/route.ts` (and anywhere else that swallows
  PostgREST errors) should log the underlying PGRST code so the next
  drift is visibly broken in runtime logs, not just at the user.
- No automated test exercises the contact / newsletter send paths or
  the subscription-status query paths; they regressed silently and
  could again without a CI tripwire.
