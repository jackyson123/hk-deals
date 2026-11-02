-- HK Deals 4.0 database schema
create extension if not exists pgcrypto;

create table if not exists public.deals (
  id text primary key,
  title text not null,
  merchant text not null,
  category text not null default '生活',
  description text,
  discount_percent integer check (discount_percent between 0 and 100),
  area text not null default '全香港',
  starts_at timestamptz,
  expires_at date,
  source_name text not null,
  source_url text not null,
  deal_url text,
  status text not null default 'active' check (status in ('active','expired','pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deals_status_expiry_idx
  on public.deals (status, expires_at);

create index if not exists deals_category_idx
  on public.deals (category);

create index if not exists deals_updated_at_idx
  on public.deals (updated_at desc);

alter table public.deals enable row level security;

-- Public visitors can read active, non-expired offers only.
drop policy if exists "Public can read active deals" on public.deals;
create policy "Public can read active deals"
on public.deals for select
to anon, authenticated
using (
  status = 'active'
  and (expires_at is null or expires_at >= (now() at time zone 'Asia/Hong_Kong')::date)
);

-- Do not add public insert/update/delete policies.
-- Ingestion uses the Supabase service role key in GitHub Actions only.
