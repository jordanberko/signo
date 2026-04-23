#!/usr/bin/env node
/**
 * Verify every migration under supabase/migrations/ has been applied to prod
 * Supabase. Probes a signal artefact (table, column, or storage bucket) per
 * migration via the service-role REST API and prints APPLIED / MISSING / SKIP.
 *
 * Usage: npm run migrations:check
 *
 * Reads .env.local for NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * Exits non-zero if any migration is missing or if any migration file in
 * supabase/migrations/ has no probe registered below.
 *
 * Structural migrations (RLS policy tweaks, CHECK constraint changes,
 * FK-cascade-behaviour changes, DROPs) are tagged `structural` and skipped —
 * PostgREST doesn't expose pg_policies / pg_constraint / pg_trigger. When we
 * add a pg_policies / pg_trigger pass-2, these SKIPs become real probes.
 * Tracked in TODO.md as a Low-priority follow-up.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

// ── Load .env.local ────────────────────────────────────────────────
const env = {};
try {
  const raw = readFileSync(join(repoRoot, '.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...rest] = t.split('=');
    let v = rest.join('=').trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k.trim()] = v;
  }
} catch (err) {
  console.error('Failed to read .env.local:', err.message);
  process.exit(2);
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
  );
  process.exit(2);
}

// ── Probe registry ─────────────────────────────────────────────────
// One entry per migration file. Kinds:
//   structural  — RLS / CHECK / FK / DROP / trigger change. No PostgREST
//                 probe; skipped. Tracked for pg_policies/pg_trigger pass-2.
//   table       — probe: `?select=*&limit=0` on the table.
//   column      — probe: `?select=<col>&limit=0` on the table.
//   table-many  — probe: table probe for each entry in `tables`.
//   storage     — probe: `/storage/v1/bucket/<name>`.
const PROBES = {
  '000_cleanup_old_schema.sql':              { kind: 'structural' },
  '001_initial_schema.sql':                  { kind: 'table',   table: 'profiles' },
  '002_add_onboarding_completed.sql':        { kind: 'column',  table: 'profiles', column: 'onboarding_completed' },
  '003_subscriptions.sql':                   { kind: 'table',   table: 'subscriptions' },
  '004_admin_rls_policies.sql':              { kind: 'structural' },
  '005_fix_profiles_rls_recursion.sql':      { kind: 'structural' },
  '006_contact_and_newsletter.sql':          { kind: 'table-many', tables: ['contact_messages', 'newsletter_subscribers'] },
  '007_conversations_messages.sql':          { kind: 'table',   table: 'conversations' },
  '008_favourites.sql':                      { kind: 'table',   table: 'favourites' },
  '009_artwork_fk_set_null.sql':             { kind: 'structural' },
  '010_is_featured.sql':                     { kind: 'column',  table: 'artworks', column: 'is_featured' },
  '011_avatars_storage.sql':                 { kind: 'storage', bucket: 'avatars' },
  '012_artist_subscription_lifecycle.sql':   { kind: 'column',  table: 'profiles', column: 'subscription_status' },
  '013_new_artwork_fields.sql':              { kind: 'column',  table: 'artworks', column: 'availability' },
  '014_follows.sql':                         { kind: 'table',   table: 'follows' },
  '015_commissions_notifications_trade.sql': { kind: 'table-many', tables: ['artwork_notifications', 'trade_enquiries'] },
  '016_collections_studio_analytics.sql':    { kind: 'table-many', tables: ['collections', 'studio_posts'] },
  '017_add_reserved_status.sql':             { kind: 'structural' },
  '018_processed_stripe_events.sql':         { kind: 'table',   table: 'processed_stripe_events' },
  '019_profile_structured_address.sql':      { kind: 'column',  table: 'profiles', column: 'street_address' },
};

// ── Probe executors ────────────────────────────────────────────────
const restHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

async function probeTable(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`;
  const r = await fetch(url, { headers: restHeaders });
  if (r.ok) return { ok: true };
  const body = (await r.text()).slice(0, 180).trim().replace(/\s+/g, ' ');
  return { ok: false, detail: `HTTP ${r.status}: ${body}` };
}

async function probeColumn(table, column) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=0`;
  const r = await fetch(url, { headers: restHeaders });
  if (r.ok) return { ok: true };
  const body = (await r.text()).slice(0, 180).trim().replace(/\s+/g, ' ');
  return { ok: false, detail: `HTTP ${r.status}: ${body}` };
}

async function probeStorage(bucket) {
  const url = `${SUPABASE_URL}/storage/v1/bucket/${bucket}`;
  const r = await fetch(url, { headers: restHeaders });
  if (r.ok) return { ok: true };
  const body = (await r.text()).slice(0, 180).trim().replace(/\s+/g, ' ');
  return { ok: false, detail: `HTTP ${r.status}: ${body}` };
}

// ── Main ───────────────────────────────────────────────────────────
const files = readdirSync(join(repoRoot, 'supabase', 'migrations'))
  .filter((n) => n.endsWith('.sql'))
  .sort();

const rows = [];
for (const file of files) {
  const probe = PROBES[file];
  if (!probe) {
    rows.push({
      file,
      kind: '(no probe registered)',
      status: 'UNKNOWN',
      detail: 'Add an entry to PROBES in scripts/verify/migrations-applied.mjs',
    });
    continue;
  }
  if (probe.kind === 'structural') {
    rows.push({ file, kind: 'structural', status: 'SKIP', detail: 'no runtime probe — see MIGRATIONS.md' });
    continue;
  }
  if (probe.kind === 'table') {
    const r = await probeTable(probe.table);
    rows.push({
      file,
      kind: `table:${probe.table}`,
      status: r.ok ? 'APPLIED' : 'MISSING',
      detail: r.detail ?? '',
    });
    continue;
  }
  if (probe.kind === 'column') {
    const r = await probeColumn(probe.table, probe.column);
    rows.push({
      file,
      kind: `col:${probe.table}.${probe.column}`,
      status: r.ok ? 'APPLIED' : 'MISSING',
      detail: r.detail ?? '',
    });
    continue;
  }
  if (probe.kind === 'table-many') {
    const failed = [];
    for (const t of probe.tables) {
      const r = await probeTable(t);
      if (!r.ok) failed.push(`${t}: ${r.detail}`);
    }
    rows.push({
      file,
      kind: `tables:${probe.tables.join(',')}`,
      status: failed.length === 0 ? 'APPLIED' : 'MISSING',
      detail: failed.join(' | '),
    });
    continue;
  }
  if (probe.kind === 'storage') {
    const r = await probeStorage(probe.bucket);
    rows.push({
      file,
      kind: `bucket:${probe.bucket}`,
      status: r.ok ? 'APPLIED' : 'MISSING',
      detail: r.detail ?? '',
    });
    continue;
  }
  rows.push({
    file,
    kind: `(unknown probe kind: ${probe.kind})`,
    status: 'UNKNOWN',
    detail: '',
  });
}

// Sanity: every file in migrations/ must have a PROBES entry.
const knownFiles = new Set(Object.keys(PROBES));
for (const f of files) {
  if (!knownFiles.has(f)) {
    // already reported above as UNKNOWN
  }
}
const extraProbes = [...knownFiles].filter((k) => !files.includes(k));
if (extraProbes.length > 0) {
  console.warn(
    `WARN: PROBES has entries with no matching file in supabase/migrations/: ${extraProbes.join(', ')}`
  );
}

// ── Print summary table ────────────────────────────────────────────
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
const wFile = Math.max(12, ...rows.map((r) => r.file.length));
const wKind = Math.max(8, ...rows.map((r) => r.kind.length));
const wStatus = Math.max(7, ...rows.map((r) => r.status.length));

console.log('');
console.log(
  `${pad('MIGRATION', wFile)}  ${pad('PROBE', wKind)}  ${pad('STATUS', wStatus)}  DETAIL`
);
console.log(
  `${'-'.repeat(wFile)}  ${'-'.repeat(wKind)}  ${'-'.repeat(wStatus)}  ${'-'.repeat(48)}`
);
for (const r of rows) {
  const color =
    r.status === 'APPLIED' ? '\x1b[32m' : r.status === 'MISSING' ? '\x1b[31m' : r.status === 'UNKNOWN' ? '\x1b[33m' : '\x1b[90m';
  console.log(
    `${pad(r.file, wFile)}  ${pad(r.kind, wKind)}  ${color}${pad(r.status, wStatus)}\x1b[0m  ${r.detail}`
  );
}
console.log('');

const counts = {
  applied: rows.filter((r) => r.status === 'APPLIED').length,
  missing: rows.filter((r) => r.status === 'MISSING').length,
  skip: rows.filter((r) => r.status === 'SKIP').length,
  unknown: rows.filter((r) => r.status === 'UNKNOWN').length,
};
console.log(
  `Summary: ${counts.applied} applied · ${counts.missing} missing · ${counts.skip} skipped (structural) · ${counts.unknown} unknown`
);
console.log('');

if (counts.missing > 0) {
  console.error(
    `\x1b[31mFAIL\x1b[0m: ${counts.missing} migration(s) not applied to Supabase.`
  );
  console.error(
    'Open Supabase Dashboard → SQL Editor, paste each missing file, then re-run this check.'
  );
  process.exit(1);
}
if (counts.unknown > 0) {
  console.error(
    `\x1b[33mFAIL\x1b[0m: ${counts.unknown} migration file(s) have no probe registered.`
  );
  console.error(
    'Update the PROBES registry in scripts/verify/migrations-applied.mjs.'
  );
  process.exit(1);
}
console.log('\x1b[32mOK\x1b[0m: all migrations verified against prod.');
