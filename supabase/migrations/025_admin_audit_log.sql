-- Admin audit trail.
--
-- Privileged admin actions (resolving a dispute and moving money, approving
-- or rejecting artwork, changing a user's role, featuring work) left no
-- record of who did what or when. For a marketplace handling other people's
-- money and inventory that's both an operational and a trust gap: a disputed
-- refund or a role change can't be traced back to an actor after the fact.
--
-- This table is append-only in practice. Rows are written by the service
-- role from API routes; there is no UPDATE/DELETE path in application code.
create table if not exists admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references profiles(id) on delete set null,
  action       text not null,            -- e.g. 'dispute.resolve', 'artwork.review', 'user.role_change'
  target_type  text,                     -- e.g. 'dispute', 'artwork', 'profile'
  target_id    text,                     -- id of the affected row (text: ids are uuids but kept loose)
  detail       jsonb,                    -- action-specific context (resolution, from/to, notes)
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx on admin_audit_log (actor_id);
create index if not exists admin_audit_log_target_idx on admin_audit_log (target_type, target_id);

-- RLS: only admins may read; writes go through the service role (which
-- bypasses RLS), so no INSERT policy is needed for authenticated users.
alter table admin_audit_log enable row level security;

drop policy if exists "admins read audit log" on admin_audit_log;
create policy "admins read audit log" on admin_audit_log
  for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
