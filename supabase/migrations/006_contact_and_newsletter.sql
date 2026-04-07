-- ============================================================
-- Contact Messages + Newsletter Subscribers tables
-- Run in Supabase SQL Editor
-- ============================================================

-- ── contact_messages ──
create table if not exists public.contact_messages (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null,
  subject     text        not null,
  message     text        not null,
  created_at  timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Allow anyone (including anonymous) to insert contact messages
create policy "contact_messages: anyone can insert"
  on public.contact_messages for insert
  with check (true);

-- Only admins can read contact messages
create policy "contact_messages: admin can select"
  on public.contact_messages for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── newsletter_subscribers ──
create table if not exists public.newsletter_subscribers (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null unique,
  created_at  timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- Allow anyone (including anonymous) to subscribe
create policy "newsletter_subscribers: anyone can insert"
  on public.newsletter_subscribers for insert
  with check (true);

-- Only admins can read subscriber list
create policy "newsletter_subscribers: admin can select"
  on public.newsletter_subscribers for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
