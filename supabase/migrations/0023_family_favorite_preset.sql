-- Release Train 2, PR 12 (final increment) — a family's favourite game carries
-- its preferred house-rule preset.
--
-- PR 11 (0021) let a family pin games; PR 12 (0022) let a room open with a chosen
-- regional variant. This joins the two: when a family pins a game they can also
-- remember *which* variant they play ("we always play all-sevens-open Lal Satti").
-- A later "start a family table" flow can pre-select that preset so the host does
-- not re-pick it every game night.
--
-- The preset id is a real engine rule-pack id (packages/game-contracts house-rules
-- registry). NULL means "the game's default preset". The check constraint pairs
-- each id with its game_key exactly like rooms_ruleset_preset_check (0022), so a
-- family can never pin a Jhabbu preset onto a Lal Satti favourite. The RPC
-- validates the same pairing before write for a clean error.

alter table public.family_group_favorite_games
  add column if not exists ruleset_preset text;

alter table public.family_group_favorite_games
  drop constraint if exists family_favorite_games_preset_check;
alter table public.family_group_favorite_games
  add constraint family_favorite_games_preset_check check (
    ruleset_preset is null
    or (game_key = 'gadha_chor' and ruleset_preset in ('classic-gulam-chor'))
    or (game_key = 'lal_satti'
        and ruleset_preset in ('lal-satti-classic-seven-of-hearts', 'lal-satti-all-sevens-open'))
    or (game_key = 'jhabbu' and ruleset_preset in ('gujarati-family-v1', 'classic-bhabho-v1'))
    or (game_key = 'kachuful' and ruleset_preset in ('family-descending-v1'))
  );

-- Replace add_family_favorite_game with a three-argument variant that accepts the
-- optional preset. The old two-argument overload is dropped so the new signature
-- is the single, unambiguous PostgREST entry point (same reasoning as 0014/0022).
drop function if exists public.add_family_favorite_game(uuid, text);

create or replace function public.add_family_favorite_game(
  p_group_id uuid,
  p_game_key text,
  p_ruleset_preset text default null
)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := public.assert_family_group_member(p_group_id);
  v_preset text := nullif(trim(p_ruleset_preset), '');
begin
  if p_game_key not in ('gadha_chor', 'lal_satti', 'jhabbu', 'kachuful') then
    raise exception 'unsupported game' using errcode = '22023';
  end if;

  -- A supplied preset must belong to the pinned game (NULL = game default).
  if v_preset is not null and not (
    (p_game_key = 'gadha_chor' and v_preset in ('classic-gulam-chor'))
    or (p_game_key = 'lal_satti'
        and v_preset in ('lal-satti-classic-seven-of-hearts', 'lal-satti-all-sevens-open'))
    or (p_game_key = 'jhabbu' and v_preset in ('gujarati-family-v1', 'classic-bhabho-v1'))
    or (p_game_key = 'kachuful' and v_preset in ('family-descending-v1'))
  ) then
    raise exception 'unsupported house-rule preset for game' using errcode = '22023';
  end if;

  -- Re-pinning the same game refreshes the chosen preset rather than erroring, so
  -- a family can change their preferred variant without unpinning first.
  insert into public.family_group_favorite_games (group_id, game_key, ruleset_preset, added_by)
  values (p_group_id, p_game_key, v_preset, v_uid)
  on conflict (group_id, game_key)
  do update set ruleset_preset = excluded.ruleset_preset;
end;
$$;

revoke all on function public.add_family_favorite_game(uuid, text, text) from public;
grant execute on function public.add_family_favorite_game(uuid, text, text)
  to authenticated, service_role;
