-- Run in Supabase Dashboard → SQL Editor
-- Project: mgxrtwbadzqyfkcoynqx

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  preferred_sprite text,
  preferred_ability text,
  total_wins integer not null default 0,
  total_games integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  room_code text,
  winner_id uuid references public.profiles (id) on delete set null,
  players jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists match_results_winner_id_idx on public.match_results (winner_id);
create index if not exists match_results_created_at_idx on public.match_results (created_at desc);

alter table public.profiles enable row level security;
alter table public.match_results enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "match_results_select_authenticated" on public.match_results;
create policy "match_results_select_authenticated"
  on public.match_results for select
  to authenticated
  using (true);

-- Inserts de partida ficam com service role no servidor (bypass RLS).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
