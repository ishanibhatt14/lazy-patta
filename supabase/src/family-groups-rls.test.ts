import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Structural verification of the PR 11 family-groups schema (no running
 * Postgres). Asserts the security *shape*: RLS on both tables, read policies
 * scoped through the recursion-safe membership predicate, NO client write
 * policies or write grants (all mutations go through the SECURITY DEFINER RPCs),
 * and each RPC is defined with a pinned search_path, an auth.uid() check, and is
 * granted to authenticated rather than public. A behavioural suite runs
 * separately against a live Supabase (family-groups-behavioral).
 */
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const schema = readFileSync(join(migrationsDir, '0020_family_groups.sql'), 'utf8');

const TABLES = ['public.family_groups', 'public.family_group_members'] as const;

const RPCS = [
  'create_family_group',
  'join_family_group_by_code',
  'rename_family_group',
  'leave_family_group',
] as const;

function policyBodies(sql: string): string[] {
  return [...sql.matchAll(/create\s+policy[\s\S]*?;/gi)].map((m) => m[0]);
}

describe('family-groups schema RLS (structural)', () => {
  it.each(TABLES)('%s enables row level security', (table) => {
    expect(schema.toLowerCase()).toContain(`alter table ${table} enable row level security`);
  });

  it('scopes both read policies through the membership predicate', () => {
    const policies = policyBodies(schema);
    expect(policies).toHaveLength(2);
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

  it('keeps the membership predicate SECURITY DEFINER so read policies cannot recurse', () => {
    const match = schema.match(
      /create or replace function public\.is_family_group_member\b[\s\S]*?\$\$;/i,
    );
    expect(match).not.toBeNull();
    expect(match?.[0].toLowerCase()).toContain('security definer');
  });
});

describe('family-groups RPCs (structural)', () => {
  it.each(RPCS)('%s is SECURITY DEFINER with a pinned search_path and checks auth.uid()', (fn) => {
    const match = schema.match(
      new RegExp(`create or replace function public\\.${fn}\\b[\\s\\S]*?\\$\\$;`, 'i'),
    );
    expect(match, fn).not.toBeNull();
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
    expect(body).toContain('auth.uid()');
  });

  it.each(RPCS)('%s is revoked from public and granted to authenticated', (fn) => {
    expect(schema).toMatch(
      new RegExp(`revoke all on function public\\.${fn}\\b[\\s\\S]*?from public`, 'i'),
    );
    expect(schema).toMatch(
      new RegExp(`grant execute on function public\\.${fn}\\b[\\s\\S]*?to authenticated`, 'i'),
    );
  });

  it('restricts rename to an organizer', () => {
    const match = schema.match(
      /create or replace function public\.rename_family_group\b[\s\S]*?\$\$;/i,
    );
    expect(match?.[0]).toMatch(/only an organizer may rename/i);
  });
});
