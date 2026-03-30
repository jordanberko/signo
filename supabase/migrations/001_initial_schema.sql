-- ============================================================
-- Signo Art Marketplace — Initial Schema Migration
-- Run this in Supabase SQL Editor (supabase.com → project → SQL Editor)
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- profiles (extends auth.users)
create table public.profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text        not null default 'buyer'
                          check (role in ('buyer', 'artist', 'admin')),
  avatar_url  text,
  bio         text,
  location    text,
  social_links    jsonb   not null default '{}',
  stripe_account_id text,
  is_verified     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- artworks
create table public.artworks (
  id              uuid        primary key default gen_random_uuid(),
  artist_id       uuid        not null references public.profiles (id) on delete cascade,
  title           text        not null,
  description     text,
  category        text        check (category in ('original', 'print', 'digital')),
  medium          text,
  style           text,
  width_cm        numeric,
  height_cm       numeric,
  depth_cm        numeric,
  price_aud       numeric(10,2) not null,
  is_framed       boolean     not null default false,
  status          text        not null default 'draft'
                              check (status in ('draft', 'pending_review', 'approved',
                                                'rejected', 'sold', 'paused')),
  review_notes    text,
  ai_review_score numeric,
  images          jsonb       not null default '[]',
  tags            text[]      default '{}',
  shipping_weight_kg numeric,
  digital_file_url   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- orders
create table public.orders (
  id                      uuid        primary key default gen_random_uuid(),
  buyer_id                uuid        not null references public.profiles (id),
  artwork_id              uuid        not null references public.artworks (id),
  artist_id               uuid        not null references public.profiles (id),
  total_amount_aud        numeric(10,2),
  platform_fee_aud        numeric(10,2),
  artist_payout_aud       numeric(10,2),
  shipping_cost_aud       numeric(10,2) default 0,
  stripe_payment_intent_id text,
  status                  text        not null default 'pending_payment'
                                      check (status in ('pending_payment', 'paid', 'shipped',
                                                        'delivered', 'completed', 'disputed',
                                                        'refunded', 'cancelled')),
  shipping_tracking_number text,
  shipping_carrier         text,
  shipped_at              timestamptz,
  delivered_at            timestamptz,
  inspection_deadline     timestamptz,
  payout_released_at      timestamptz,
  shipping_address        jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- disputes
create table public.disputes (
  id                    uuid        primary key default gen_random_uuid(),
  order_id              uuid        not null references public.orders (id),
  raised_by             uuid        not null references public.profiles (id),
  type                  text        not null
                                    check (type in ('damaged', 'not_as_described',
                                                    'not_received', 'other')),
  description           text        not null,
  evidence_images       jsonb       not null default '[]',
  artist_packaging_photos jsonb     not null default '[]',
  status                text        not null default 'open'
                                    check (status in ('open', 'under_review',
                                                      'resolved_refund', 'resolved_no_refund',
                                                      'resolved_return')),
  resolution_notes      text,
  resolved_at           timestamptz,
  created_at            timestamptz not null default now()
);

-- reviews
create table public.reviews (
  id          uuid        primary key default gen_random_uuid(),
  order_id    uuid        not null unique references public.orders (id),
  buyer_id    uuid        not null references public.profiles (id),
  artist_id   uuid        not null references public.profiles (id),
  artwork_id  uuid        not null references public.artworks (id),
  rating      integer     not null check (rating >= 1 and rating <= 5),
  comment     text,
  artist_response text,
  created_at  timestamptz not null default now()
);

-- messages
create table public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid       not null,
  sender_id       uuid       not null references public.profiles (id),
  receiver_id     uuid       not null references public.profiles (id),
  artwork_id      uuid       references public.artworks (id),
  content         text       not null,
  is_read         boolean    not null default false,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

create index idx_artworks_artist_id  on public.artworks (artist_id);
create index idx_artworks_status     on public.artworks (status);
create index idx_orders_buyer_id     on public.orders (buyer_id);
create index idx_orders_artist_id    on public.orders (artist_id);
create index idx_orders_artwork_id   on public.orders (artwork_id);
create index idx_messages_conversation on public.messages (conversation_id);
create index idx_messages_sender     on public.messages (sender_id);
create index idx_messages_receiver   on public.messages (receiver_id);

-- ============================================================
-- 3. TRIGGER FUNCTIONS
-- ============================================================

-- Auto-update updated_at on row change
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_artworks
  before update on public.artworks
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_orders
  before update on public.orders
  for each row execute function public.handle_updated_at();

-- Auto-create a profiles row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(
      case
        when new.raw_user_meta_data ->> 'role' in ('buyer', 'artist', 'admin')
        then new.raw_user_meta_data ->> 'role'
        else 'buyer'
      end,
      'buyer'
    )
  );
  return new;
exception when others then
  raise log 'handle_new_user error: %', sqlerrm;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles  enable row level security;
alter table public.artworks  enable row level security;
alter table public.orders    enable row level security;
alter table public.disputes  enable row level security;
alter table public.reviews   enable row level security;
alter table public.messages  enable row level security;

-- ---------- profiles ----------
-- Anyone can read profiles
create policy "profiles: anyone can select"
  on public.profiles for select
  using (true);

-- Users can update only their own row
create policy "profiles: owner can update"
  on public.profiles for update
  using (auth.uid() = id);

-- The trigger inserts via security definer, but allow direct insert for own id too
create policy "profiles: owner can insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---------- artworks ----------
-- Anyone can see approved artworks; artists can see all of their own
create policy "artworks: public approved + own"
  on public.artworks for select
  using (status = 'approved' or artist_id = auth.uid());

-- Any authenticated user can insert artworks as themselves (dual-role: everyone can sell)
create policy "artworks: authenticated insert own"
  on public.artworks for insert
  with check (artist_id = auth.uid());

-- Artists can update their own artworks
create policy "artworks: owner can update"
  on public.artworks for update
  using (artist_id = auth.uid());

-- Artists can delete their own artworks
create policy "artworks: owner can delete"
  on public.artworks for delete
  using (artist_id = auth.uid());

-- ---------- orders ----------
-- Buyers see orders they placed; artists see orders for their artworks
create policy "orders: buyer can select own"
  on public.orders for select
  using (buyer_id = auth.uid());

create policy "orders: artist can select own"
  on public.orders for select
  using (artist_id = auth.uid());

-- Only the service role (server-side API routes) can insert/update orders.
-- This is enforced by NOT creating insert/update policies for anon/authenticated.
-- If you later need client-side order creation, add a narrow policy here.

-- ---------- disputes ----------
-- The buyer who raised it and the artist on the order can see the dispute
create policy "disputes: involved parties can select"
  on public.disputes for select
  using (
    raised_by = auth.uid()
    or exists (
      select 1 from public.orders
      where orders.id = disputes.order_id
        and orders.artist_id = auth.uid()
    )
  );

-- Only the buyer on the order can create a dispute
create policy "disputes: buyer can insert"
  on public.disputes for insert
  with check (
    raised_by = auth.uid()
    and exists (
      select 1 from public.orders
      where orders.id = order_id
        and orders.buyer_id = auth.uid()
    )
  );

-- ---------- reviews ----------
-- Anyone can read reviews
create policy "reviews: anyone can select"
  on public.reviews for select
  using (true);

-- Buyers can create a review only for their own completed orders
create policy "reviews: buyer can insert for completed order"
  on public.reviews for insert
  with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from public.orders
      where orders.id = order_id
        and orders.buyer_id = auth.uid()
        and orders.status = 'completed'
    )
  );

-- ---------- messages ----------
-- Users can read messages where they are sender or receiver
create policy "messages: participant can select"
  on public.messages for select
  using (sender_id = auth.uid() or receiver_id = auth.uid());

-- Users can send messages as themselves
create policy "messages: authenticated can insert as sender"
  on public.messages for insert
  with check (sender_id = auth.uid());

-- Receiver can mark messages as read
create policy "messages: receiver can update"
  on public.messages for update
  using (receiver_id = auth.uid());
