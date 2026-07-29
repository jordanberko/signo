import { createClient } from '@supabase/supabase-js';
import { isMissingTableError } from '@/lib/supabase/schema-fallback';

/**
 * Append a row to the admin audit trail.
 *
 * Fire-and-forget and strictly non-fatal: an audit-write failure must never
 * block or fail the admin action it records (the action has usually already
 * moved money or state by the time we log it). Uses the service role so the
 * insert isn't subject to RLS.
 *
 * Degrades gracefully before migration 025 is applied — a missing table is
 * logged and swallowed rather than thrown, so the audit trail can be added
 * without coordinating a deploy with the migration.
 */
export interface AdminAuditEntry {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string | null;
  detail?: Record<string, unknown>;
}

export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from('admin_audit_log').insert({
      actor_id: entry.actorId,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      detail: entry.detail ?? null,
    });

    if (error) {
      if (isMissingTableError(error)) {
        console.warn(
          `[Audit] admin_audit_log not present yet (migration 025 unapplied); dropped: ${entry.action}`
        );
        return;
      }
      console.error('[Audit] Failed to write audit entry:', error.message, entry.action);
    }
  } catch (err) {
    console.error(
      '[Audit] Exception writing audit entry:',
      err instanceof Error ? err.message : String(err)
    );
  }
}
