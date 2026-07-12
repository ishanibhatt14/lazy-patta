-- User preferences: per-account settings (locale, sound, haptics, motion).
-- Locale is constrained to the shipped set (en/gu/hi) to match localization.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  locale text not null default 'en' check (locale in ('en', 'gu', 'hi')),
  sound_enabled boolean not null default true,
  haptics_enabled boolean not null default true,
  reduced_motion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Base table privileges (see 0001_profiles.sql). RLS restricts rows to the
-- owner; these grants let the authenticated role reach the table. anon gets
-- nothing — guests keep preferences locally, not server-side.
grant select, insert, update on public.user_preferences to authenticated, service_role;
