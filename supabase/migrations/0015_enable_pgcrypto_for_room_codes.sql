-- Make allocate_room_code()'s crypto-backed randomness actually resolvable.
--
-- 0013 rewrote room-code allocation to draw bytes from gen_random_bytes(), a
-- pgcrypto function. But pgcrypto was never enabled, and the function pins
-- `search_path = public`, so the call resolved to nothing and every create_room
-- aborted with 42883 ("function gen_random_bytes(integer) does not exist"). The
-- PGRST203 overload ambiguity fixed in 0014 had been masking this until now.
--
-- Enable pgcrypto in the conventional Supabase `extensions` schema and widen the
-- function's search_path to include it. get_byte() is a core function and stays
-- reachable via public. gen_random_uuid() used elsewhere is core too and is
-- unaffected.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.allocate_room_code()
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

    if not exists (
      select 1
      from public.rooms
      where code = v_code
        and status in ('lobby', 'in_progress')
    ) then
      return v_code;
    end if;

    if v_try >= 20 then
      raise exception 'could not allocate a unique room code' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;
