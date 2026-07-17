-- ============================================================
-- Public visibility for sold artworks
--
-- The Just Sold page lists recently sold works, but the public
-- SELECT policy on artworks only exposed status = 'approved',
-- so every sold work's detail page 404'd for visitors (and any
-- anon-scoped query for sold works returned zero rows).
--
-- Widen the public policy to include 'sold'. Draft, pending
-- review, rejected, and reserved works remain hidden from the
-- public; artists still see all of their own.
-- ============================================================

drop policy "artworks: public approved + own" on public.artworks;

create policy "artworks: public approved/sold + own"
  on public.artworks for select
  using (status in ('approved', 'sold') or artist_id = auth.uid());
