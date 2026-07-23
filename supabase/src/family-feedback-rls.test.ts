import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Structural verification of PR 15's founder-family feedback (migration 0025).
 * Asserts the same security shape as the rest of the family schema: RLS on the
 * table, a single read policy scoped through is_family_group_member, NO client
 * write policies or write grants, and the submit RPC SECURITY DEFINER with a
 * pinned search_path, membership-checked, revoked from public, granted to
 * authenticated. Also checks the honest-founder invariant: feedback carries no
 * rating/score/reward column — just a category and a message.
 */
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const schema = readFileSync(join(migrationsDir, '0025_family_feedback.sql'), 'utf8');

function policyBodies(sql: string): string[] {
  return [...sql.matchAll(/create\s+policy[\s\S]*?;/gi)].map((m) => m[0]);
}

/** The SQL with `-- …` comment lines stripped, so prose never trips a match. */
function executableSql(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

describe('family feedback schema RLS (structural)', () => {
  it('enables row level security on the table', () => {
    expect(schema.toLowerCase()).toContain(
      'alter table public.family_group_feedback enable row level security',
    );
  });

  it('scopes its single read policy through the membership predicate', () => {
    const policies = policyBodies(schema);
    expect(policies).toHaveLength(1);
    const body = policies[0]!.toLowerCase();
    expect(body).toContain('for select');
    expect(body).toContain('is_family_group_member(');
  });

  it('exposes no client INSERT/UPDATE/DELETE policies (writes go through the RPC)', () => {
    for (const body of policyBodies(schema)) {
      expect(body.toLowerCase()).not.toMatch(/for\s+(insert|update|delete)/);
    }
  });

  it('grants only SELECT to authenticated on the table', () => {
    expect(schema.toLowerCase()).not.toMatch(
      /grant[^;]*\b(insert|update|delete)\b[^;]*to\s+authenticated/,
    );
  });

  it('constrains category to the idea/problem/praise allow-list', () => {
    const lower = schema.toLowerCase();
    expect(lower).toContain("category in ('idea', 'problem', 'praise')");
  });

  it('carries no rating/score/reward column (honest founder = a voice, not points)', () => {
    expect(executableSql(schema).toLowerCase()).not.toMatch(
      /\b(rating|score|points|reward|stars)\b/,
    );
  });
});

describe('family feedback RPC (structural)', () => {
  it('submit_family_feedback is SECURITY DEFINER with a pinned search_path and checks membership', () => {
    const match = schema.match(
      /create or replace function public\.submit_family_feedback\b[\s\S]*?\$\$;/i,
    );
    expect(match).not.toBeNull();
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
    expect(body).toContain('assert_family_group_member(');
  });

  it('submit_family_feedback is revoked from public and granted to authenticated', () => {
    expect(schema).toMatch(
      /revoke all on function public\.submit_family_feedback\b[\s\S]*?from public/i,
    );
    expect(schema).toMatch(
      /grant execute on function public\.submit_family_feedback\b[\s\S]*?to authenticated/i,
    );
  });
});
