import { sendOpsAlert } from '@/lib/ops-alert';

/**
 * Tolerance shim for migration 023 (`artworks.reserved_by`, `reserved_at`,
 * `reserved_session_id`).
 *
 * Signo's migrations are applied by hand, so a deploy can reach production
 * before the SQL has been run. Every write and read that touches the
 * reservation columns would then fail — which would take the checkout path
 * down entirely, the exact thing those columns were added to protect. Each
 * such call site retries in a pre-023 shape when it sees a missing-column
 * error, and alerts so the gap is visible rather than silent.
 *
 * Once `npm run migrations:check` reports 023 APPLIED for every environment,
 * this module and its four call sites can be deleted.
 */

interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
}

/**
 * True when Supabase rejected the statement because a column doesn't exist.
 *
 *   PGRST204 — PostgREST can't find the column in its schema cache (writes).
 *   42703    — Postgres `undefined_column` (selects and filters).
 */
export function isMissingColumnError(
  error: PostgrestLikeError | null | undefined
): boolean {
  if (!error) return false;
  return error.code === 'PGRST204' || error.code === '42703';
}

export async function alertMissingMigration023(
  where: string,
  detail: string
): Promise<void> {
  console.error(
    `[Schema] Migration 023 appears unapplied — ${where} fell back to pre-023 behaviour: ${detail}`
  );
  await sendOpsAlert({
    title: 'Migration 023 is not applied to this database',
    description:
      `${where} could not use the artwork reservation columns, so it ran without them. ` +
      `Reservations are not owner-tracked until migration 023 is applied: a buyer cannot resume ` +
      `an abandoned checkout, and the release-reservations cron falls back to scanning Stripe. ` +
      `Apply supabase/migrations/023_sale_integrity_constraints.sql (Supabase Dashboard → SQL ` +
      `Editor), then run \`npm run migrations:check\`.`,
    context: { where, detail },
    level: 'error',
  });
}
