-- ============================================================
-- CLEANUP: Drop old schema before running new migration
-- Run this FIRST, then run 001_initial_schema.sql
-- ============================================================

-- Drop old triggers first
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists set_updated_at_users on public.users;
drop trigger if exists set_updated_at_artworks on public.artworks;
drop trigger if exists set_updated_at_orders on public.orders;
drop trigger if exists set_updated_at_disputes on public.disputes;

-- Drop old trigger functions
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_updated_at() cascade;

-- Drop old tables (order matters due to foreign keys)
drop table if exists public.messages cascade;
drop table if exists public.reviews cascade;
drop table if exists public.disputes cascade;
drop table if exists public.orders cascade;
drop table if exists public.artworks cascade;
drop table if exists public.users cascade;
drop table if exists public.profiles cascade;

-- Drop old enums
drop type if exists user_role cascade;
drop type if exists artwork_category cascade;
drop type if exists artwork_status cascade;
drop type if exists order_status cascade;
drop type if exists dispute_type cascade;
drop type if exists dispute_status cascade;
