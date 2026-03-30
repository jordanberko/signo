-- Signo Art Marketplace Database Schema
-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

create type user_role as enum ('buyer', 'artist', 'admin');
create type artwork_category as enum ('original', 'print', 'digital');
create type artwork_status as enum ('draft', 'pending_review', 'approved', 'rejected', 'sold', 'paused');
create type order_status as enum ('pending_payment', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded', 'cancelled');
create type dispute_type as enum ('damaged', 'not_as_described', 'not_received', 'other');
create type dispute_status as enum ('open', 'under_review', 'resolved_refund', 'resolved_no_refund', 'resolved_return');

-- ============================================
-- USERS (profiles linked to Supabase Auth)
-- ============================================

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email varchar not null unique,
  full_name varchar not null,
  role user_role not null default 'buyer',
  avatar_url varchar,
  bio text,
  location varchar,
  social_links jsonb default '{}',
  stripe_account_id varchar,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- ARTWORKS
-- ============================================

create table public.artworks (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid not null references public.users(id) on delete cascade,
  title varchar not null,
  description text not null default '',
  category artwork_category not null,
  medium varchar not null default '',
  style varchar not null default '',
  width_cm decimal,
  height_cm decimal,
  depth_cm decimal,
  price_aud decimal(10,2) not null,
  is_framed boolean not null default false,
  status artwork_status not null default 'draft',
  review_notes text,
  ai_review_score decimal,
  images jsonb not null default '[]',
  tags text[] default '{}',
  shipping_weight_kg decimal,
  digital_file_url varchar,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- ORDERS
-- ============================================

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.users(id),
  artwork_id uuid not null references public.artworks(id),
  artist_id uuid not null references public.users(id),
  total_amount_aud decimal(10,2) not null,
  platform_fee_aud decimal(10,2) not null,
  artist_payout_aud decimal(10,2) not null,
  shipping_cost_aud decimal(10,2),
  stripe_payment_intent_id varchar,
  status order_status not null default 'pending_payment',
  shipping_tracking_number varchar,
  shipping_carrier varchar,
  shipped_at timestamptz,
  delivered_at timestamptz,
  inspection_deadline timestamptz,
  payout_released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- DISPUTES
-- ============================================

create table public.disputes (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id),
  raised_by uuid not null references public.users(id),
  type dispute_type not null,
  description text not null,
  evidence_images jsonb not null default '[]',
  artist_packaging_photos jsonb not null default '[]',
  status dispute_status not null default 'open',
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- REVIEWS
-- ============================================

create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null unique references public.orders(id),
  buyer_id uuid not null references public.users(id),
  artist_id uuid not null references public.users(id),
  artwork_id uuid not null references public.artworks(id),
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ============================================
-- MESSAGES
-- ============================================

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null,
  sender_id uuid not null references public.users(id),
  receiver_id uuid not null references public.users(id),
  artwork_id uuid references public.artworks(id),
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_artworks_artist on public.artworks(artist_id);
create index idx_artworks_status on public.artworks(status);
create index idx_artworks_category on public.artworks(category);
create index idx_artworks_price on public.artworks(price_aud);
create index idx_artworks_created on public.artworks(created_at desc);
create index idx_orders_buyer on public.orders(buyer_id);
create index idx_orders_artist on public.orders(artist_id);
create index idx_orders_status on public.orders(status);
create index idx_disputes_order on public.disputes(order_id);
create index idx_reviews_artist on public.reviews(artist_id);
create index idx_reviews_artwork on public.reviews(artwork_id);
create index idx_messages_conversation on public.messages(conversation_id);
create index idx_messages_receiver on public.messages(receiver_id);

-- Full text search index on artworks
create index idx_artworks_search on public.artworks
  using gin(to_tsvector('english', title || ' ' || description || ' ' || medium || ' ' || style));

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table public.users enable row level security;
alter table public.artworks enable row level security;
alter table public.orders enable row level security;
alter table public.disputes enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;

-- Users: anyone can read profiles, users can update their own
create policy "Public profiles are viewable by everyone" on public.users
  for select using (true);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

-- Artworks: approved artworks are public, artists manage their own
create policy "Approved artworks are viewable by everyone" on public.artworks
  for select using (status = 'approved' or artist_id = auth.uid());

create policy "Artists can insert own artworks" on public.artworks
  for insert with check (artist_id = auth.uid());

create policy "Artists can update own artworks" on public.artworks
  for update using (artist_id = auth.uid());

create policy "Artists can delete own artworks" on public.artworks
  for delete using (artist_id = auth.uid());

-- Orders: buyers and artists can see their own orders
create policy "Users can view own orders" on public.orders
  for select using (buyer_id = auth.uid() or artist_id = auth.uid());

create policy "Buyers can create orders" on public.orders
  for insert with check (buyer_id = auth.uid());

create policy "Order participants can update" on public.orders
  for update using (buyer_id = auth.uid() or artist_id = auth.uid());

-- Disputes: visible to order participants
create policy "Dispute participants can view" on public.disputes
  for select using (
    raised_by = auth.uid() or
    order_id in (select id from public.orders where artist_id = auth.uid())
  );

create policy "Buyers can create disputes" on public.disputes
  for insert with check (raised_by = auth.uid());

-- Reviews: public read, buyers can create
create policy "Reviews are viewable by everyone" on public.reviews
  for select using (true);

create policy "Buyers can create reviews" on public.reviews
  for insert with check (buyer_id = auth.uid());

-- Messages: participants can view and send
create policy "Users can view own messages" on public.messages
  for select using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Users can send messages" on public.messages
  for insert with check (sender_id = auth.uid());

create policy "Users can update own messages" on public.messages
  for update using (receiver_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_users before update on public.users
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_artworks before update on public.artworks
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_orders before update on public.orders
  for each row execute function public.handle_updated_at();

create trigger set_updated_at_disputes before update on public.disputes
  for each row execute function public.handle_updated_at();

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'buyer')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

insert into storage.buckets (id, name, public) values ('artwork-images', 'artwork-images', true);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('digital-downloads', 'digital-downloads', false);

-- Storage policies
create policy "Anyone can view artwork images" on storage.objects
  for select using (bucket_id = 'artwork-images');

create policy "Authenticated users can upload artwork images" on storage.objects
  for insert with check (bucket_id = 'artwork-images' and auth.role() = 'authenticated');

create policy "Users can update own artwork images" on storage.objects
  for update using (bucket_id = 'artwork-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Buyers can download purchased digital art" on storage.objects
  for select using (
    bucket_id = 'digital-downloads' and
    auth.uid() in (
      select buyer_id from public.orders
      where status in ('paid', 'completed')
      and artwork_id::text = (storage.foldername(name))[1]
    )
  );
