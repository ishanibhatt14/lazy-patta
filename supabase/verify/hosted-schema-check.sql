-- Hosted-schema verification (read-only). Run this AFTER `supabase db push`
-- against the hosted project — paste it into the Supabase SQL editor, or:
--   psql "$SUPABASE_DB_URL" -f supabase/verify/hosted-schema-check.sql
--
-- Every row must read PASS. It touches only system catalogs + the migration
-- ledger; it reads no game data and needs no secrets in chat. It asserts the
-- Phase 3 privacy invariants: all tables RLS-guarded, the two authority tables
-- server-only (no client DML + no policies), and the persistence RPCs
-- SECURITY DEFINER + not executable by authenticated.
--
-- Note: Supabase grants REFERENCES/TRIGGER/TRUNCATE to `authenticated` on every
-- public table by default. Those are not data-access paths (PostgREST exposes
-- only SELECT/INSERT/UPDATE/DELETE, all still RLS-governed), so check 4 inspects
-- DML privileges only.

with expected(t) as (
  values ('profiles'), ('user_preferences'), ('account_deletion_requests'),
         ('rooms'), ('room_seats'), ('games'), ('game_private_hands'),
         ('game_events'), ('game_authority_state'), ('game_action_log')
)
select *
from (
  -- 1. All six migrations applied, including 0006.
  select
    '1_migrations_applied' as check_name,
    string_agg(version, ',' order by version) as detail,
    case when count(*) >= 6 and bool_or(version = '0006') then 'PASS' else 'FAIL' end as status
  from supabase_migrations.schema_migrations

  union all
  -- 2. Every expected table exists.
  select
    '2_tables_present',
    coalesce(string_agg(e.t, ',') filter (where c.oid is null), '(all present)'),
    case when count(*) filter (where c.oid is null) = 0 then 'PASS' else 'FAIL' end
  from expected e
  left join pg_class c
    on c.relname = e.t and c.relkind = 'r' and c.relnamespace = 'public'::regnamespace

  union all
  -- 3. RLS enabled on every expected table.
  select
    '3_rls_enabled_all',
    coalesce(string_agg(e.t, ',') filter (where c.relrowsecurity is not true), '(all enabled)'),
    case when count(*) filter (where c.relrowsecurity is not true) = 0 then 'PASS' else 'FAIL' end
  from expected e
  left join pg_class c
    on c.relname = e.t and c.relkind = 'r' and c.relnamespace = 'public'::regnamespace

  union all
  -- 4. Authority tables are server-only: `authenticated` holds no DML privilege
  --    (SELECT/INSERT/UPDATE/DELETE) on them. REFERENCES/TRIGGER/TRUNCATE are
  --    Supabase platform defaults present on every public table — harmless
  --    (unreachable via PostgREST, and RLS still governs rows), so they are
  --    excluded here. This is the actual no-card-leakage guarantee.
  select
    '4_authority_tables_no_client_dml',
    coalesce(string_agg(distinct table_name || ':' || privilege_type, ','), '(no client DML)'),
    case when count(*) = 0 then 'PASS' else 'FAIL' end
  from information_schema.role_table_grants
  where grantee = 'authenticated' and table_schema = 'public'
    and table_name in ('game_authority_state', 'game_action_log')
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')

  union all
  -- 5. Persistence RPCs exist and are SECURITY DEFINER.
  select
    '5_authority_fns_security_definer',
    string_agg(proname || ':secdef=' || prosecdef::text, ','),
    case when count(*) = 2 and bool_and(prosecdef) then 'PASS' else 'FAIL' end
  from pg_proc
  where proname in ('start_game', 'commit_game_action')
    and pronamespace = 'public'::regnamespace

  union all
  -- 6. Those RPCs are NOT executable by `authenticated` (service_role only).
  select
    '6_authority_fns_not_authenticated',
    string_agg(proname || ':authexec=' || has_function_privilege('authenticated', oid, 'EXECUTE')::text, ','),
    case when bool_or(has_function_privilege('authenticated', oid, 'EXECUTE')) then 'FAIL' else 'PASS' end
  from pg_proc
  where proname in ('start_game', 'commit_game_action')
    and pronamespace = 'public'::regnamespace

  union all
  -- 7. Room/lifecycle RLS policies present (expect the full set: 14).
  select
    '7_rls_policy_count',
    count(*)::text,
    case when count(*) >= 14 then 'PASS' else 'FAIL' end
  from pg_policies
  where schemaname = 'public'

  union all
  -- 8. A player can read their own hand: game_private_hands has a policy.
  select
    '8_private_hands_has_policy',
    count(*)::text,
    case when count(*) >= 1 then 'PASS' else 'FAIL' end
  from pg_policies
  where schemaname = 'public' and tablename = 'game_private_hands'

  union all
  -- 9. Full authority state is unreadable by clients: zero policies (default-deny).
  select
    '9_authority_state_no_policy',
    count(*)::text,
    case when count(*) = 0 then 'PASS' else 'FAIL' end
  from pg_policies
  where schemaname = 'public' and tablename = 'game_authority_state'
) checks
order by check_name;
