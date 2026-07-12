import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/**
 * Structural verification of the Phase 0 migrations. This asserts the security
 * *shape* of every user-accessible table without needing a running Postgres:
 * RLS is enabled, rows are owned via a cascading FK to auth.users, and every
 * policy is owner-scoped through auth.uid(). A full behavioural RLS test
 * (cross-user denial) runs separately against a local Supabase instance.
 */
const TABLES = [
  { file: '0001_profiles.sql', table: 'public.profiles', ownerColumn: 'id' },
  { file: '0002_user_preferences.sql', table: 'public.user_preferences', ownerColumn: 'user_id' },
  {
    file: '0003_account_deletion_requests.sql',
    table: 'public.account_deletion_requests',
    ownerColumn: 'user_id',
  },
] as const;

function sqlFor(file: string): string {
  return readFileSync(join(migrationsDir, file), 'utf8');
}

/** Extract the body of every `create policy ... ;` statement in the SQL. */
function policyBodies(sql: string): string[] {
  return [...sql.matchAll(/create\s+policy[\s\S]*?;/gi)].map((m) => m[0]);
}

describe('supabase RLS foundation', () => {
  it.each(TABLES)('$table enables row level security', ({ file, table }) => {
    const sql = sqlFor(file).toLowerCase();
    expect(sql).toContain(`alter table ${table} enable row level security`);
  });

  it.each(TABLES)('$table owns rows via a cascading FK to auth.users', ({ file, ownerColumn }) => {
    const sql = sqlFor(file).toLowerCase();
    expect(sql).toMatch(
      new RegExp(`${ownerColumn}\\s+uuid[\\s\\S]*?references\\s+auth\\.users`),
    );
    expect(sql).toContain('on delete cascade');
  });

  it.each(TABLES)('$table defines at least one policy', ({ file }) => {
    expect(policyBodies(sqlFor(file)).length).toBeGreaterThan(0);
  });

  it.each(TABLES)('every $table policy is owner-scoped through auth.uid()', ({ file }) => {
    for (const body of policyBodies(sqlFor(file))) {
      expect(body.toLowerCase()).toContain('auth.uid()');
    }
  });
});
