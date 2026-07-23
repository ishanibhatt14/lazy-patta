-- Release Train 2, PR 11 — Family Groups MVP.
--
-- A *family group* is an optional, persistent circle ("Bhatt Family") that
-- outlives any single room: relatives keep a durable membership, a shared name,
-- and — in later increments — favourite games, recent tables, and series
-- history. It is the foundation the rest of Release Train 2 attaches to.
--
-- Security follows the same shape as the rooms schema (0004/0018): clients hold
-- NO direct writes. Every mutation goes through a SECURITY DEFINER RPC that
-- stamps the caller from auth.uid(); RLS lets a user read only the groups they
-- belong to and the co-members of those groups, never anyone else's. Membership
-- is joined by a shareable, crypto-random code — no authorization token ever
-- rides in a URL, exactly like a room invite.
--
-- RLS recursion note: a "members can see co-members" policy that queried the
-- members table directly would recurse (the policy's own SELECT re-triggers the
-- policy). We break that with a SECURITY DEFINER helper, is_family_group_member,
-- which reads membership with RLS bypassed and is the single source of truth for
-- both tables' read policies.

-- ---------------------------------------------------------------------------
-- family_groups — one row per persistent family circle.
-- ---------------------------------------------------------------------------
create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  -- A permanent, shareable join code. Unlike a room code (which is recycled once
  -- a room ends) a family code is stable for the life of the group.
  join_code text not null unique check (join_code ~ '^[A-Z0-9]{6}$'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- family_group_members — durable membership, with a coarse role. The organizer
-- (creator, or anyone they promote later) may rename the group; members may
-- always leave. display_name is the name shown for this person within THIS
-- family, independent of their global profile.
-- ---------------------------------------------------------------------------
create table if not exists public.family_group_members (
  group_id uuid not null references public.family_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('organizer', 'member')),
  display_name text check (display_name is null or char_length(display_name) <= 60),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists family_group_members_user_idx
  on public.family_group_members (user_id);

-- ---------------------------------------------------------------------------
-- Membership predicate, RLS-bypassing to avoid recursive policy evaluation.
-- ---------------------------------------------------------------------------
create or replace function public.is_family_group_member(p_group_id uuid, p_uid uuid)
  returns boolean
  language sql
  security definer
  set search_path = public
  stable
as $$
  select exists (
    select 1
    from public.family_group_members m
    where m.group_id = p_group_id
      and m.user_id = p_uid
  );
$$;

-- ---------------------------------------------------------------------------
-- Crypto-random, collision-checked family code. Mirrors allocate_room_code
-- (0015) but its uniqueness scope is the whole family_groups table, forever.
-- ---------------------------------------------------------------------------
create or replace function public.allocate_family_group_code()
  returns text
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  v_byte int;
  v_try int := 0;
  v_pos int;
begin
  loop
    v_try := v_try + 1;
    v_code := '';

    for v_pos in 1..6 loop
      v_byte := get_byte(gen_random_bytes(1), 0);
      v_code := v_code || substr(v_alphabet, (v_byte % length(v_alphabet)) + 1, 1);
    end loop;

    if not exists (select 1 from public.family_groups where join_code = v_code) then
      return v_code;
    end if;

    if v_try >= 20 then
      raise exception 'could not allocate a unique family code' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: read only groups you belong to, and only co-members of those groups. No
-- client write policies — RPCs handle every mutation.
-- ---------------------------------------------------------------------------
alter table public.family_groups enable row level security;
alter table public.family_group_members enable row level security;

create policy "family_groups_select_member"
  on public.family_groups for select
  using (public.is_family_group_member(id, auth.uid()));

create policy "family_group_members_select_comember"
  on public.family_group_members for select
  using (public.is_family_group_member(group_id, auth.uid()));

grant select on public.family_groups to authenticated;
grant select on public.family_group_members to authenticated;
grant all on public.family_groups to service_role;
grant all on public.family_group_members to service_role;

-- ---------------------------------------------------------------------------
-- create_family_group: create a group and seat the caller as its organizer.
-- ---------------------------------------------------------------------------
create or replace function public.create_family_group(
  p_name text,
  p_display_name text default null
)
  returns public.family_groups
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_group public.family_groups;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if v_name is null or char_length(v_name) > 60 then
    raise exception 'a family name of 1 to 60 characters is required' using errcode = '22023';
  end if;

  insert into public.family_groups (name, join_code, created_by)
  values (v_name, public.allocate_family_group_code(), v_uid)
  returning * into v_group;

  insert into public.family_group_members (group_id, user_id, role, display_name)
  values (
    v_group.id,
    v_uid,
    'organizer',
    nullif(trim(coalesce(p_display_name, '')), '')
  );

  return v_group;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_family_group_by_code: idempotent membership by shareable code. Re-joining
-- is a no-op that keeps the existing role (so an organizer is never demoted).
-- ---------------------------------------------------------------------------
create or replace function public.join_family_group_by_code(
  p_code text,
  p_display_name text default null
)
  returns public.family_groups
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(nullif(trim(coalesce(p_code, '')), ''));
  v_group public.family_groups;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if v_code is null or v_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'that family code is not valid' using errcode = '22023';
  end if;

  select * into v_group from public.family_groups where join_code = v_code;
  if not found then
    raise exception 'no family found for that code' using errcode = 'P0002';
  end if;

  insert into public.family_group_members (group_id, user_id, role, display_name)
  values (v_group.id, v_uid, 'member', nullif(trim(coalesce(p_display_name, '')), ''))
  on conflict (group_id, user_id) do nothing;

  return v_group;
end;
$$;

-- ---------------------------------------------------------------------------
-- rename_family_group: organizer-only rename. Touches updated_at.
-- ---------------------------------------------------------------------------
create or replace function public.rename_family_group(p_group_id uuid, p_name text)
  returns public.family_groups
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(trim(coalesce(p_name, '')), '');
  v_role text;
  v_group public.family_groups;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if v_name is null or char_length(v_name) > 60 then
    raise exception 'a family name of 1 to 60 characters is required' using errcode = '22023';
  end if;

  select role into v_role
  from public.family_group_members
  where group_id = p_group_id and user_id = v_uid;

  if v_role is null then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;
  if v_role <> 'organizer' then
    raise exception 'only an organizer may rename the family' using errcode = '42501';
  end if;

  update public.family_groups
  set name = v_name, updated_at = now()
  where id = p_group_id
  returning * into v_group;

  return v_group;
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_family_group: drop the caller's own membership. The last member leaving
-- takes the (now empty) group with them, so no orphaned families accumulate.
-- ---------------------------------------------------------------------------
create or replace function public.leave_family_group(p_group_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  delete from public.family_group_members
  where group_id = p_group_id and user_id = v_uid;

  delete from public.family_groups g
  where g.id = p_group_id
    and not exists (
      select 1 from public.family_group_members m where m.group_id = g.id
    );
end;
$$;

revoke all on function public.is_family_group_member(uuid, uuid) from public;
revoke all on function public.allocate_family_group_code() from public;
revoke all on function public.create_family_group(text, text) from public;
revoke all on function public.join_family_group_by_code(text, text) from public;
revoke all on function public.rename_family_group(uuid, text) from public;
revoke all on function public.leave_family_group(uuid) from public;

grant execute on function public.is_family_group_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.create_family_group(text, text) to authenticated, service_role;
grant execute on function public.join_family_group_by_code(text, text) to authenticated, service_role;
grant execute on function public.rename_family_group(uuid, text) to authenticated, service_role;
grant execute on function public.leave_family_group(uuid) to authenticated, service_role;
