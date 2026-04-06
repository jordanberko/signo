-- ============================================================
-- Fix infinite recursion in profiles RLS policy
--
-- The "profiles: admin can select all" policy queries the profiles
-- table itself to check admin status, causing Postgres error 42P17
-- (infinite recursion). This policy is redundant anyway because
-- "profiles: anyone can select" (from 001) already uses (true).
-- ============================================================

drop policy if exists "profiles: admin can select all" on public.profiles;
