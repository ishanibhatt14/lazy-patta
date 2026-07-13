-- Hosted-schema / security-boundary verification (read-only). Run this AFTER
-- `supabase db push` against the hosted project — paste it into the Supabase SQL
-- editor, or:
--   psql -v ON_ERROR_STOP=1 "$SUPABASE_DB_URL" -f supabase/verify/hosted-schema-check.sql
--
-- WHAT THIS IS: a static assertion that the deployed *schema and its security
-- boundary* match the design — migrations applied, RLS on every table, the two
-- authority tables server-only (no client DML + no policies), the exact set of
-- lifecycle RLS policies present, and the persistence RPCs SECURITY DEFINER with
-- a pinned search_path and server-only EXECUTE.
--
-- WHAT THIS IS NOT: the complete "no card leakage" guarantee. Because the
-- authority route handlers run with the *service-role* credential (which bypasses
-- RLS by design), the final guarantee still requires the two-device smoke test and
-- inspection of the actual API/network responses — this script cannot observe
-- what the server chooses to return. Treat a green run here as "the database-level
-- boundary is intact", not "the product cannot leak a hand".
--
-- It touches only system catalogs + the migration ledger; it reads no game data
-- and needs no secrets in chat. Every row must read PASS; the first row
-- (`0_overall`) is the roll-up of all the checks below it.
--
-- Note on Supabase defaults: Supabase grants REFERENCES/TRIGGER/TRUNCATE to
-- `authenticated` on every public table. Those are not data-access paths
-- (PostgREST exposes only SELECT/INSERT/UPDATE/DELETE, all RLS-governed), so the
-- authority-table check inspects DML privileges only, for BOTH `anon` and
-- `authenticated`, via has_table_privilege (which also catches PUBLIC-inherited
-- grants).

with
  -- ── ground-truth expectations ────────────────────────────────────────────
  expected_migrations(version) as (
    values ('0001'), ('0002'), ('0003'), ('0004'), ('0005'), ('0006')
  ),
  expected_tables(t) as (
    values ('profiles'), ('user_preferences'), ('account_deletion_requests'),
           ('rooms'), ('room_seats'), ('games'), ('game_private_hands'),
           ('game_events'), ('game_authority_state'), ('game_action_log')
  ),
  -- The full lifecycle policy set: (table, policy, command). Roles are asserted
  -- separately (check 8) to be exactly {public}.
  expected_policies(tablename, policyname, cmd) as (
    values
      ('account_deletion_requests', 'account_deletion_requests_select_own',        'SELECT'),
      ('account_deletion_requests', 'account_deletion_requests_insert_own',        'INSERT'),
      ('account_deletion_requests', 'account_deletion_requests_update_own_pending','UPDATE'),
      ('profiles',                  'profiles_select_own',                         'SELECT'),
      ('profiles',                  'profiles_insert_own',                         'INSERT'),
      ('profiles',                  'profiles_update_own',                         'UPDATE'),
      ('user_preferences',          'user_preferences_select_own',                 'SELECT'),
      ('user_preferences',          'user_preferences_insert_own',                 'INSERT'),
      ('user_preferences',          'user_preferences_update_own',                 'UPDATE'),
      ('rooms',                     'rooms_select_member',                         'SELECT'),
      ('room_seats',                'room_seats_select_member',                    'SELECT'),
      ('games',                     'games_select_member',                         'SELECT'),
      ('game_private_hands',        'game_private_hands_select_own',               'SELECT'),
      ('game_events',               'game_events_select_member',                   'SELECT')
  ),
  -- Exact identity signatures of the two persistence RPCs.
  expected_functions(proname, args) as (
    values
      ('start_game',         'uuid, jsonb, jsonb, jsonb, jsonb'),
      ('commit_game_action', 'uuid, text, text, integer, jsonb, jsonb, jsonb, jsonb, text, jsonb')
  ),

  checks as (
    -- 1. Exactly the six expected migrations are applied (no missing versions).
    select
      '1_migrations_exact' as check_name,
      'present=' || coalesce((select string_agg(version, ',' order by version)
                              from supabase_migrations.schema_migrations), '(none)')
        || '; missing=' || coalesce(
             (select string_agg(em.version, ',' order by em.version)
              from expected_migrations em
              left join supabase_migrations.schema_migrations sm using (version)
              where sm.version is null), '(none)') as detail,
      case when not exists (
        select 1 from expected_migrations em
        left join supabase_migrations.schema_migrations sm using (version)
        where sm.version is null
      ) then 'PASS' else 'FAIL' end as status

    union all
    -- 2. Every expected table exists.
    select
      '2_tables_present',
      coalesce(string_agg(e.t, ',') filter (where c.oid is null), '(all present)'),
      case when count(*) filter (where c.oid is null) = 0 then 'PASS' else 'FAIL' end
    from expected_tables e
    left join pg_class c
      on c.relname = e.t and c.relkind = 'r' and c.relnamespace = 'public'::regnamespace

    union all
    -- 3. RLS enabled on every expected table.
    select
      '3_rls_enabled_all',
      coalesce(string_agg(e.t, ',') filter (where c.relrowsecurity is not true), '(all enabled)'),
      case when count(*) filter (where c.relrowsecurity is not true) = 0 then 'PASS' else 'FAIL' end
    from expected_tables e
    left join pg_class c
      on c.relname = e.t and c.relkind = 'r' and c.relnamespace = 'public'::regnamespace

    union all
    -- 4. Authority tables hold NO client DML for anon OR authenticated. Uses
    --    has_table_privilege so PUBLIC-inherited grants are also caught. This is
    --    the database-level no-card-leakage boundary.
    select
      '4_authority_tables_no_client_dml',
      coalesce(string_agg(role_priv, ','), '(no client DML)'),
      case when count(*) = 0 then 'PASS' else 'FAIL' end
    from (
      select g.role || ' can ' || p.priv || ' ' || t.tbl as role_priv
      from (values ('game_authority_state'), ('game_action_log')) t(tbl)
      cross join (values ('anon'), ('authenticated')) g(role)
      cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv)
      where has_table_privilege(g.role, ('public.' || t.tbl)::regclass, p.priv)
    ) leaks

    union all
    -- 5. Authority tables have ZERO RLS policies (default-deny; unreadable by any
    --    client even if a grant were mistakenly added).
    select
      '5_authority_tables_no_policies',
      'game_authority_state=' || (select count(*) from pg_policies
                                  where schemaname='public' and tablename='game_authority_state')::text
        || ', game_action_log=' || (select count(*) from pg_policies
                                    where schemaname='public' and tablename='game_action_log')::text,
      case when (select count(*) from pg_policies
                 where schemaname='public'
                   and tablename in ('game_authority_state','game_action_log')) = 0
           then 'PASS' else 'FAIL' end

    union all
    -- 6. The lifecycle policy set matches EXACTLY (no missing, no unexpected),
    --    matched by table + name + command.
    select
      '6_policies_exact_set',
      'missing=' || coalesce((
          select string_agg(ep.tablename || '.' || ep.policyname || '(' || ep.cmd || ')', ',')
          from expected_policies ep
          left join pg_policies pp
            on pp.schemaname='public' and pp.tablename=ep.tablename
           and pp.policyname=ep.policyname and pp.cmd=ep.cmd
          where pp.policyname is null), '(none)')
      || '; unexpected=' || coalesce((
          select string_agg(pp.tablename || '.' || pp.policyname || '(' || pp.cmd || ')', ',')
          from pg_policies pp
          left join expected_policies ep
            on ep.tablename=pp.tablename and ep.policyname=pp.policyname and ep.cmd=pp.cmd
          where pp.schemaname='public' and ep.policyname is null), '(none)'),
      case when
        not exists (
          select 1 from expected_policies ep
          left join pg_policies pp
            on pp.schemaname='public' and pp.tablename=ep.tablename
           and pp.policyname=ep.policyname and pp.cmd=ep.cmd
          where pp.policyname is null)
        and not exists (
          select 1 from pg_policies pp
          left join expected_policies ep
            on ep.tablename=pp.tablename and ep.policyname=pp.policyname and ep.cmd=pp.cmd
          where pp.schemaname='public' and ep.policyname is null)
      then 'PASS' else 'FAIL' end

    union all
    -- 7. The own-hand policy is specifically a SELECT restricted to the current
    --    user (auth.uid() = user_id) — this is what lets a player read only their
    --    own cards.
    select
      '7_private_hands_select_own_scoped',
      coalesce(string_agg(cmd || ' qual=' || coalesce(qual, '(null)'), '; '), '(policy missing)'),
      case when count(*) = 1
                and bool_and(cmd = 'SELECT')
                and bool_and(qual ilike '%auth.uid()%' and qual ilike '%user_id%')
           then 'PASS' else 'FAIL' end
    from pg_policies
    where schemaname='public' and tablename='game_private_hands'
      and policyname='game_private_hands_select_own'

    union all
    -- 8. Every public-schema policy targets exactly role {public} (none silently
    --    broadened to a specific privileged role).
    select
      '8_all_policies_role_public',
      coalesce(string_agg(distinct tablename || '.' || policyname || '=' || roles::text, ','), '(none)'),
      case when count(*) filter (where roles <> '{public}') = 0 then 'PASS' else 'FAIL' end
    from pg_policies
    where schemaname='public'

    union all
    -- 9. Persistence RPCs exist with the EXACT input-type signatures, are
    --    SECURITY DEFINER, and pin search_path=public. Signature is derived from
    --    proargtypes via format_type so it is independent of parameter names.
    select
      '9_rpcs_signature_secdef_searchpath',
      coalesce(string_agg(
        ef.proname || '(' || ef.args || ')'
          || ' found=' || (p.oid is not null)::text
          || ' args=' || coalesce(a.actual_args, '(none)')
          || ' secdef=' || coalesce(p.prosecdef::text, '-')
          || ' sp=' || coalesce(('search_path=public' = any(p.proconfig))::text, '-'),
        '; '), '(none)'),
      case when bool_and(p.oid is not null)
                and bool_and(a.actual_args = ef.args)
                and bool_and(p.prosecdef)
                and bool_and('search_path=public' = any(p.proconfig))
           then 'PASS' else 'FAIL' end
    from expected_functions ef
    left join pg_proc p
      on p.proname = ef.proname
     and p.pronamespace = 'public'::regnamespace
    left join lateral (
      select string_agg(format_type(t, null), ', ' order by ord) as actual_args
      from unnest(p.proargtypes) with ordinality as at(t, ord)
    ) a on true

    union all
    -- 10. Those RPCs are EXECUTE-able by service_role ONLY (never anon or
    --     authenticated) — the server holds sole authority to persist.
    select
      '10_rpcs_execute_service_role_only',
      coalesce(string_agg(
        p.proname
          || ' anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text
          || ' auth=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
          || ' service=' || has_function_privilege('service_role', p.oid, 'EXECUTE')::text,
        '; '), '(none)'),
      case when count(*) = 2
                and bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) is not true
                and bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')) is not true
                and bool_and(has_function_privilege('service_role', p.oid, 'EXECUTE'))
           then 'PASS' else 'FAIL' end
    from pg_proc p
    where p.proname in ('start_game', 'commit_game_action')
      and p.pronamespace = 'public'::regnamespace
  )

-- Roll-up first, then each check.
select '0_overall' as check_name,
       count(*) filter (where status = 'FAIL')::text || ' failing of ' || count(*)::text as detail,
       case when count(*) filter (where status <> 'PASS') = 0 then 'PASS' else 'FAIL' end as status
from checks
union all
select check_name, detail, status from checks
order by check_name;
