import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Structural verification of the Phase 3 room schema (no running Postgres).
 * Asserts the security *shape*: RLS on every table, the private-hand policy is
 * owner-only, there are NO client write policies or write grants (all mutations
 * go through the SECURITY DEFINER RPCs in 0005), and each RPC is defined with a
 * pinned search_path and granted to authenticated rather than public. A full
 * behavioural suite runs separately against a live Supabase (rooms-behavioral).
 */
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const schema = readFileSync(join(migrationsDir, '0004_rooms.sql'), 'utf8');
const rpcs = readFileSync(join(migrationsDir, '0005_room_rpcs.sql'), 'utf8');
const onlineGameKeys = readFileSync(join(migrationsDir, '0008_online_game_keys.sql'), 'utf8');
const houseRules = readFileSync(join(migrationsDir, '0022_room_house_rules.sql'), 'utf8');

const ROOM_TABLES = [
  'public.rooms',
  'public.room_seats',
  'public.games',
  'public.game_private_hands',
  'public.game_events',
] as const;

const RPCS = [
  'create_room',
  'join_room_by_code',
  'set_seat_ready',
  'add_bot_seat',
  'remove_seat',
  'leave_room',
] as const;

function policyBodies(sql: string): string[] {
  return [...sql.matchAll(/create\s+policy[\s\S]*?;/gi)].map((m) => m[0]);
}

describe('rooms schema RLS (structural)', () => {
  it.each(ROOM_TABLES)('%s enables row level security', (table) => {
    expect(schema.toLowerCase()).toContain(`alter table ${table} enable row level security`);
  });

  it('the private-hand policy is scoped to the owner only', () => {
    const match = schema.match(/create policy "game_private_hands_select_own"[\s\S]*?;/i);
    expect(match).not.toBeNull();
    expect(match?.[0].toLowerCase()).toContain('auth.uid() = user_id');
  });

  it('exposes no client INSERT/UPDATE/DELETE policies (writes go through RPCs)', () => {
    for (const body of policyBodies(schema)) {
      const lower = body.toLowerCase();
      expect(lower).toContain('for select');
      expect(lower).not.toMatch(/for\s+(insert|update|delete)/);
    }
  });

  it('grants only SELECT to authenticated on room tables', () => {
    expect(schema.toLowerCase()).not.toMatch(
      /grant[^;]*\b(insert|update|delete)\b[^;]*to\s+authenticated/,
    );
  });
});

describe('room RPCs (structural)', () => {
  it.each(RPCS)('%s is SECURITY DEFINER with a pinned search_path and checks auth.uid()', (fn) => {
    const match = rpcs.match(
      new RegExp(`create or replace function public\\.${fn}\\b[\\s\\S]*?\\$\\$;`, 'i'),
    );
    expect(match, fn).not.toBeNull();
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
    expect(body).toContain('auth.uid()');
  });

  it.each(RPCS)('%s is revoked from public and granted to authenticated', (fn) => {
    expect(rpcs).toMatch(
      new RegExp(`revoke all on function public\\.${fn}\\b[\\s\\S]*?from public`, 'i'),
    );
    expect(rpcs).toMatch(
      new RegExp(`grant execute on function public\\.${fn}\\b[\\s\\S]*?to authenticated`, 'i'),
    );
  });
});

describe('online room game keys (structural)', () => {
  it('adds explicit game_key columns to rooms and games', () => {
    const lower = onlineGameKeys.toLowerCase();
    expect(lower).toContain('alter table public.rooms');
    expect(lower).toContain('add column if not exists game_key');
    expect(lower).toContain("check (game_key in ('gadha_chor', 'lal_satti'))");
    expect(lower).toContain('alter table public.games');
  });

  it('extends create_room and carries the room game_key into start_game', () => {
    const lower = onlineGameKeys.toLowerCase();
    expect(lower).toContain('p_game_key text');
    expect(lower).toContain("if p_game_key not in ('gadha_chor', 'lal_satti')");
    expect(lower).toContain(
      'insert into public.rooms (code, host_id, max_seats, locale, game_key)',
    );
    expect(lower).toContain('insert into public.games (room_id, game_key, status');
    expect(lower).toContain('v_room.game_key');
  });
});

describe('room house-rule preset (structural, 0022)', () => {
  it('adds a nullable ruleset_preset column to rooms', () => {
    const lower = houseRules.toLowerCase();
    expect(lower).toContain('alter table public.rooms');
    expect(lower).toContain('add column if not exists ruleset_preset text');
  });

  it('constrains each preset id to its own game_key (or NULL)', () => {
    const match = houseRules.match(
      /add constraint rooms_ruleset_preset_check check \([\s\S]*?\);/i,
    );
    expect(match).not.toBeNull();
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('ruleset_preset is null');
    expect(body).toContain("game_key = 'lal_satti'");
    expect(body).toContain("'lal-satti-classic-seven-of-hearts', 'lal-satti-all-sevens-open'");
    expect(body).toContain("game_key = 'jhabbu'");
    expect(body).toContain("'gujarati-family-v1', 'classic-bhabho-v1'");
  });

  it('drops the old 4-arg create_room so the 5-arg overload is unambiguous', () => {
    expect(houseRules.toLowerCase()).toContain(
      'drop function if exists public.create_room(smallint, text, text, text)',
    );
  });

  it('recreates create_room with a defaulted preset arg, pinned search_path, and auth check', () => {
    const match = houseRules.match(
      /create or replace function public\.create_room\b[\s\S]*?\$\$;/i,
    );
    expect(match).not.toBeNull();
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('p_ruleset_preset text default null');
    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
    expect(body).toContain('auth.uid()');
    expect(body).toContain('unsupported house-rule preset for game');
    expect(body).toContain(
      'insert into public.rooms (code, host_id, max_seats, locale, game_key, ruleset_preset)',
    );
  });

  it('revokes the 5-arg create_room from public and grants it to authenticated', () => {
    expect(houseRules).toMatch(
      /revoke all on function public\.create_room\(smallint, text, text, text, text\)[\s\S]*?from public/i,
    );
    expect(houseRules).toMatch(
      /grant execute on function public\.create_room\(smallint, text, text, text, text\)[\s\S]*?to authenticated/i,
    );
  });
});
