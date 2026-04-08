-- Allow artwork deletion by making artwork_id nullable and adding ON DELETE SET NULL
-- This ensures orders/reviews/conversations retain their records but lose the artwork link

-- ── Orders ──
ALTER TABLE public.orders ALTER COLUMN artwork_id DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT orders_artwork_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_artwork_id_fkey
  FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE SET NULL;

-- ── Reviews ──
ALTER TABLE public.reviews ALTER COLUMN artwork_id DROP NOT NULL;
ALTER TABLE public.reviews DROP CONSTRAINT reviews_artwork_id_fkey;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_artwork_id_fkey
  FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE SET NULL;

-- ── Conversations (from migration 007) ──
-- artwork_id is already nullable, just need ON DELETE SET NULL
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_artwork_id_fkey;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_artwork_id_fkey
  FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE SET NULL;

-- ── Messages ──
-- artwork_id is already nullable, just need ON DELETE SET NULL
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_artwork_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_artwork_id_fkey
  FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE SET NULL;
