-- Profiles: one row per authenticated account (1:1 with auth.users).
-- Guests have no row here; a profile is created only after sign-in + setup.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user sees and edits only their own profile. No DELETE policy: account
-- removal flows through account_deletion_requests and cascades from auth.users.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Base table privileges. RLS above restricts *which* rows a caller sees; these
-- grants decide *whether* a role may touch the table at all. Without them the
-- authenticated role gets "permission denied" before any policy is evaluated.
-- Guests (anon) are granted nothing by design — they own no profile. No DELETE:
-- removal flows through account_deletion_requests and the auth.users cascade.
grant select, insert, update on public.profiles to authenticated, service_role;
