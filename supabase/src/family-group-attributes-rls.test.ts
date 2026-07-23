import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Structural verification of the PR 11 (increment 3) family-group attributes
 * schema (no running Postgres). Asserts the same security shape as 0020: RLS on
 * all three tables, read policies scoped through is_family_group_member, NO
 * client write policies or write grants (mutations go through SECURITY DEFINER
 * RPCs), and each RPC is pinned-search_path, membership-checked, revoked from
 * public and granted to authenticated. A behavioural suite runs separately
 * against a live Supabase (family-group-attributes-behavioral).
 */
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const schema = readFileSync(join(migrationsDir, '0021_family_group_attributes.sql'), 'utf8');

const TABLES = [
  'public.family_group_favorite_games',
  'public.family_group_recent_tables',
  'public.family_group_series_results',
] as const;

const RPCS = [
  'add_family_favorite_game',
  'remove_family_favorite_game',
  'record_family_table',
  'record_family_series_result',
] as const;

function policyBodies(sql: string): string[] {
  return [...sql.matchAll(/create\s+policy[\s\S]*?;/gi)].map((m) => m[0]);
}

describe('family-group attributes schema RLS (structural)', () => {
  it.each(TABLES)('%s enables row level security', (table) => {
    expect(schema.toLowerCase()).toContain(`alter table ${table} enable row level security`);
  });

  it('scopes all three read policies through the membership predicate', () => {
    const policies = policyBodies(schema);
    expect(policies).toHaveLength(3);
    for (const body of policies) {
      const lower = body.toLowerCase();
      expect(lower).toContain('for select');
      expect(lower).toContain('is_family_group_member(');
    }
  });

  it('exposes no client INSERT/UPDATE/DELETE policies (writes go through RPCs)', () => {
    for (const body of policyBodies(schema)) {
      expect(body.toLowerCase()).not.toMatch(/for\s+(insert|update|delete)/);
    }
  });

  it('grants only SELECT to authenticated on the tables', () => {
    expect(schema.toLowerCase()).not.toMatch(
      /grant[^;]*\b(insert|update|delete)\b[^;]*to\s+authenticated/,
    );
  });

  it('constrains game_key to the online allow-list on every table', () => {
    const checks = [
      ...schema.matchAll(/game_key text not null\s*\n?\s*check \(game_key in \(([^)]*)\)\)/gi),
    ];
    expect(checks).toHaveLength(3);
    for (const [, list] of checks) {
      for (const key of ['gadha_chor', 'lal_satti', 'jhabbu', 'kachuful']) {
        expect(list).toContain(key);
      }
    }
  });
});

describe('family-group attributes RPCs (structural)', () => {
  it.each(RPCS)('%s is SECURITY DEFINER with a pinned search_path and checks membership', (fn) => {
    const match = schema.match(
      new RegExp(`create or replace function public\\.${fn}\\b[\\s\\S]*?\\$\\$;`, 'i'),
    );
    expect(match, fn).not.toBeNull();
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
    expect(body).toContain('assert_family_group_member(');
  });

  it.each(RPCS)('%s is revoked from public and granted to authenticated', (fn) => {
    expect(schema).toMatch(
      new RegExp(`revoke all on function public\\.${fn}\\b[\\s\\S]*?from public`, 'i'),
    );
    expect(schema).toMatch(
      new RegExp(`grant execute on function public\\.${fn}\\b[\\s\\S]*?to authenticated`, 'i'),
    );
  });

  it('keeps the membership guard SECURITY DEFINER and auth-checked', () => {
    const match = schema.match(
      /create or replace function public\.assert_family_group_member\b[\s\S]*?\$\$;/i,
    );
    expect(match).not.toBeNull();
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('security definer');
    expect(body).toContain('auth.uid()');
    expect(body).toContain('is_family_group_member(');
  });
});
