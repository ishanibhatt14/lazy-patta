-- Release Train 2, PR 15 — founder-family feedback capture.
--
-- The earliest families are the people who shape Lazy Patta. This migration
-- gives them a first-class way to tell us what to build next: a small,
-- member-scoped feedback table and a single SECURITY DEFINER RPC to append to
-- it. There is deliberately no rating, no score, no gamified reward — just a
-- category (idea / problem / praise) and a short message, in the family's own
-- words. The "founder" badge itself is derived on the client from a family's
-- creation date, so this migration adds no flag and grants no special power;
-- every family can leave feedback the same way.
--
-- Security follows 0020/0021 exactly: clients hold NO direct writes. Reads are
-- scoped to the caller's memberships through is_family_group_member; the write
-- goes through a SECURITY DEFINER RPC that re-checks membership via
-- assert_family_group_member (0021) and stamps the author from auth.uid().

create table if not exists public.family_group_feedback (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups (id) on delete cascade,
  category text not null check (category in ('idea', 'problem', 'praise')),
  message text not null check (char_length(message) between 1 and 1000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists family_group_feedback_group_idx
  on public.family_group_feedback (group_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: a member may read the feedback their own family has left. No client
-- write policies — the RPC below owns the only mutation.
-- ---------------------------------------------------------------------------
alter table public.family_group_feedback enable row level security;

create policy "family_feedback_select_member"
  on public.family_group_feedback for select
  using (public.is_family_group_member(group_id, auth.uid()));

grant select on public.family_group_feedback to authenticated;
grant all on public.family_group_feedback to service_role;

-- ---------------------------------------------------------------------------
-- submit_family_feedback — a member leaves one piece of feedback for the
-- family. Returns the created row so the client can show it immediately.
-- ---------------------------------------------------------------------------
create or replace function public.submit_family_feedback(
  p_group_id uuid,
  p_category text,
  p_message text
)
  returns public.family_group_feedback
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := public.assert_family_group_member(p_group_id);
  v_message text := nullif(trim(coalesce(p_message, '')), '');
  v_row public.family_group_feedback;
begin
  if p_category not in ('idea', 'problem', 'praise') then
    raise exception 'unsupported feedback category' using errcode = '22023';
  end if;
  if v_message is null then
    raise exception 'feedback message is required' using errcode = '22023';
  end if;
  if char_length(v_message) > 1000 then
    raise exception 'that feedback is too long' using errcode = '22023';
  end if;

  insert into public.family_group_feedback (group_id, category, message, created_by)
  values (p_group_id, p_category, v_message, v_uid)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.submit_family_feedback(uuid, text, text) from public;
grant execute on function public.submit_family_feedback(uuid, text, text)
  to authenticated, service_role;
