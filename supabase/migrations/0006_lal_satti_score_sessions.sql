-- Lal Satti saved score sessions.
--
-- These rows are personal score history for signed-in users. They do not drive
-- live gameplay authority, reveal private hands, or alter the room system.

create table if not exists public.lal_satti_score_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  player_count smallint not null check (player_count between 3 and 6),
  locale text not null default 'en' check (locale in ('en', 'gu', 'hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lal_satti_score_sessions_owner_idx
  on public.lal_satti_score_sessions (owner_id, created_at desc);

create table if not exists public.lal_satti_score_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lal_satti_score_sessions (id) on delete cascade,
  round_number integer not null check (round_number > 0),
  winner_names text[] not null check (array_length(winner_names, 1) >= 1),
  leftovers jsonb not null default '[]'::jsonb check (jsonb_typeof(leftovers) = 'array'),
  created_at timestamptz not null default now(),
  unique (session_id, round_number)
);

create index if not exists lal_satti_score_rounds_session_idx
  on public.lal_satti_score_rounds (session_id, round_number);

-- Helper for round policies. SECURITY DEFINER lets the policy check ownership
-- through the parent session without recursive RLS surprises.
create or replace function public.owns_lal_satti_score_session(p_session_id uuid)
  returns boolean
  language sql
  security definer
  set search_path = public
  stable
as $$
  select exists (
    select 1
    from public.lal_satti_score_sessions s
    where s.id = p_session_id
      and s.owner_id = auth.uid()
  );
$$;

revoke all on function public.owns_lal_satti_score_session(uuid) from public;
grant execute on function public.owns_lal_satti_score_session(uuid) to authenticated, service_role;

alter table public.lal_satti_score_sessions enable row level security;
alter table public.lal_satti_score_rounds enable row level security;

create policy "lal_satti_score_sessions_select_own"
  on public.lal_satti_score_sessions for select
  using (auth.uid() = owner_id);

create policy "lal_satti_score_sessions_insert_own"
  on public.lal_satti_score_sessions for insert
  with check (auth.uid() = owner_id);

create policy "lal_satti_score_sessions_update_own"
  on public.lal_satti_score_sessions for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "lal_satti_score_sessions_delete_own"
  on public.lal_satti_score_sessions for delete
  using (auth.uid() = owner_id);

create policy "lal_satti_score_rounds_select_own_session"
  on public.lal_satti_score_rounds for select
  using (public.owns_lal_satti_score_session(session_id));

create policy "lal_satti_score_rounds_insert_own_session"
  on public.lal_satti_score_rounds for insert
  with check (public.owns_lal_satti_score_session(session_id));

create policy "lal_satti_score_rounds_update_own_session"
  on public.lal_satti_score_rounds for update
  using (public.owns_lal_satti_score_session(session_id))
  with check (public.owns_lal_satti_score_session(session_id));

create policy "lal_satti_score_rounds_delete_own_session"
  on public.lal_satti_score_rounds for delete
  using (public.owns_lal_satti_score_session(session_id));

grant select, insert, update, delete
  on public.lal_satti_score_sessions to authenticated, service_role;
grant select, insert, update, delete
  on public.lal_satti_score_rounds to authenticated, service_role;
