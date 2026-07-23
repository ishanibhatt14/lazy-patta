import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Structural verification of PR 14's scheduled game nights (migration 0024).
 * Asserts the same security shape as the rest of the family schema: RLS on the
 * table, a single read policy scoped through is_family_group_member, NO client
 * write policies or write grants, and both RPCs SECURITY DEFINER with a pinned
 * search_path, membership-checked, revoked from public, and granted to
 * authenticated. Also checks the honest-reminder invariant: the migration ships
 * no notification/push machinery, only the plan rows.
 */
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const schema = readFileSync(join(migrationsDir, '0024_family_game_nights.sql'), 'utf8');

const RPCS = ['schedule_family_game_night', 'cancel_family_game_night'] as const;

function policyBodies(sql: string): string[] {
  return [...sql.matchAll(/create\s+policy[\s\S]*?;/gi)].map((m) => m[0]);
}

describe('family game nights schema RLS (structural)', () => {
  it('enables row level security on the table', () => {
    expect(schema.toLowerCase()).toContain(
      'alter table public.family_group_game_nights enable row level security',
    );
  });

  it('scopes its single read policy through the membership predicate', () => {
    const policies = policyBodies(schema);
    expect(policies).toHaveLength(1);
    const body = policies[0]!.toLowerCase();
    expect(body).toContain('for select');
    expect(body).toContain('is_family_group_member(');
  });

  it('exposes no client INSERT/UPDATE/DELETE policies (writes go through RPCs)', () => {
    for (const body of policyBodies(schema)) {
      expect(body.toLowerCase()).not.toMatch(/for\s+(insert|update|delete)/);
    }
  });

  it('grants only SELECT to authenticated on the table', () => {
    expect(schema.toLowerCase()).not.toMatch(
      /grant[^;]*\b(insert|update|delete)\b[^;]*to\s+authenticated/,
    );
  });

  it('constrains game_key to the online allow-list (nullable)', () => {
    const lower = schema.toLowerCase();
    expect(lower).toContain('game_key is null or game_key in');
    for (const key of ['gadha_chor', 'lal_satti', 'jhabbu', 'kachuful']) {
      expect(lower).toContain(key);
    }
  });

  it('ships no push/notification machinery (honest reminder = calendar only)', () => {
    expect(schema.toLowerCase()).not.toMatch(/pg_cron|pg_net|notify|webhook|push/);
  });
});

describe('family game nights RPCs (structural)', () => {
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

  it('re-derives membership from the night’s own group when cancelling', () => {
    const match = schema.match(
      /create or replace function public\.cancel_family_game_night\b[\s\S]*?\$\$;/i,
    );
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('select group_id into v_group_id');
    expect(body).toContain('assert_family_group_member(v_group_id)');
  });
});
