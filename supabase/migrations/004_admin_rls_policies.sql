-- ============================================================
-- Admin RLS policies
-- Allows users with role = 'admin' full read/write on key tables
-- ============================================================

-- Helper: is the current user an admin?
-- Used in all policies below.
-- EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')

-- ---------- artworks ----------
-- Admins can SELECT all artworks (any status, any artist)
create policy "artworks: admin can select all"
  on public.artworks for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can UPDATE all artworks (approve/reject in review queue)
create policy "artworks: admin can update all"
  on public.artworks for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ---------- orders ----------
-- Admins can SELECT all orders
create policy "orders: admin can select all"
  on public.orders for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can UPDATE all orders (resolve disputes, update status)
create policy "orders: admin can update all"
  on public.orders for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ---------- disputes ----------
-- Admins can SELECT all disputes
create policy "disputes: admin can select all"
  on public.disputes for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can UPDATE all disputes (resolve)
create policy "disputes: admin can update all"
  on public.disputes for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ---------- profiles ----------
-- Admins can SELECT all profiles (view buyer/artist info)
create policy "profiles: admin can select all"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ---------- reviews ----------
-- Admins can SELECT all reviews
create policy "reviews: admin can select all"
  on public.reviews for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
