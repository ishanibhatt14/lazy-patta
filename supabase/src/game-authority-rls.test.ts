import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Structural verification of the live-gameplay authority schema (no running
 * Postgres). Asserts the security *shape* of migration 0006: the full-state and
 * idempotency tables are server-only (RLS on, no authenticated grant), and the
 * persistence RPCs are SECURITY DEFINER, search-path-pinned, revoked from public,
 * and granted to service_role ONLY — never to authenticated. A live behavioural
 * suite exercises a full match separately (see docs/adr/0010). This is the grant-
 * level proof that a client can never read another player's hand or forge state.
 */
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const sql = readFileSync(join(migrationsDir, '0006_game_authority.sql'), 'utf8');
const lower = sql.toLowerCase();

const SERVER_ONLY_TABLES = ['public.game_authority_state', 'public.game_action_log'] as const;

const PERSISTENCE_RPCS = ['start_game', 'commit_game_action'] as const;

function functionBody(fn: string): string {
  const match = sql.match(
    new RegExp(`create or replace function public\\.${fn}\\b[\\s\\S]*?\\$\\$;`, 'i'),
  );
  expect(match, `function ${fn} should be defined`).not.toBeNull();
  return match![0].toLowerCase();
}

describe('game authority schema (structural)', () => {
  it.each(SERVER_ONLY_TABLES)('%s enables row level security', (table) => {
    expect(lower).toContain(`alter table ${table} enable row level security`);
  });

  it.each(SERVER_ONLY_TABLES)('%s is never granted to authenticated (server-only)', (table) => {
    // No grant of any privilege on these tables reaches authenticated users.
    expect(lower).not.toMatch(
      new RegExp(`grant[^;]*on\\s+${table.replace('.', '\\.')}[^;]*to[^;]*authenticated`),
    );
  });

  it('game_authority_state is granted only to service_role', () => {
    expect(lower).toContain('grant all on public.game_authority_state to service_role');
  });

  it('exposes no client-facing SELECT policy on the full-state table', () => {
    // The hidden-card table must have NO policy that could expose it to a client.
    expect(lower).not.toMatch(/create\s+policy[^;]*on\s+public\.game_authority_state/);
  });
});

describe('persistence RPCs (structural)', () => {
  it.each(PERSISTENCE_RPCS)('%s is SECURITY DEFINER with a pinned search_path', (fn) => {
    const body = functionBody(fn);
    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
  });

  it.each(PERSISTENCE_RPCS)('%s is revoked from public and granted to service_role', (fn) => {
    expect(lower).toMatch(new RegExp(`revoke all on function public\\.${fn}\\b[^;]*from public`));
    expect(lower).toMatch(
      new RegExp(`grant execute on function public\\.${fn}\\b[^;]*to service_role`),
    );
  });

  it.each(PERSISTENCE_RPCS)('%s is NOT granted to authenticated (no client call path)', (fn) => {
    expect(lower).not.toMatch(
      new RegExp(`grant execute on function public\\.${fn}\\b[^;]*authenticated`),
    );
  });

  it('commit_game_action enforces the optimistic-concurrency version guard', () => {
    const body = functionBody('commit_game_action');
    expect(body).toContain('state_version <> p_expected_version');
    expect(body).toContain('for update');
  });

  it('commit_game_action is idempotent on (game, actor, client action id)', () => {
    const body = functionBody('commit_game_action');
    expect(body).toContain('from public.game_action_log');
    expect(body).toContain('client_action_id = p_client_action_id');
  });
});
