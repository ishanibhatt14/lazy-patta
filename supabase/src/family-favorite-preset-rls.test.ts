import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Structural verification of PR 12's final increment (migration 0023): a family's
 * favourite game carries an optional house-rule preset. Asserts the column and
 * its game-paired check constraint, that the old 2-arg add_family_favorite_game
 * is dropped so the 3-arg overload is unambiguous, and that the recreated RPC
 * keeps the SECURITY DEFINER / membership-checked / pinned-search_path shape and
 * validates the preset↔game pairing before write.
 */
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const schema = readFileSync(join(migrationsDir, '0023_family_favorite_preset.sql'), 'utf8');

describe('family favourite preset (structural, 0023)', () => {
  it('adds a nullable ruleset_preset column to family_group_favorite_games', () => {
    const lower = schema.toLowerCase();
    expect(lower).toContain('alter table public.family_group_favorite_games');
    expect(lower).toContain('add column if not exists ruleset_preset text');
  });

  it('constrains each preset id to its own game_key (or NULL)', () => {
    const match = schema.match(
      /add constraint family_favorite_games_preset_check check \([\s\S]*?\);/i,
    );
    expect(match).not.toBeNull();
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('ruleset_preset is null');
    expect(body).toContain("game_key = 'lal_satti'");
    expect(body).toContain("'lal-satti-classic-seven-of-hearts', 'lal-satti-all-sevens-open'");
    expect(body).toContain("game_key = 'jhabbu'");
    expect(body).toContain("'gujarati-family-v1', 'classic-bhabho-v1'");
  });

  it('drops the old 2-arg add_family_favorite_game so the 3-arg overload is unambiguous', () => {
    expect(schema.toLowerCase()).toContain(
      'drop function if exists public.add_family_favorite_game(uuid, text)',
    );
  });

  it('recreates the RPC with a defaulted preset arg, membership check, and pairing validation', () => {
    const match = schema.match(
      /create or replace function public\.add_family_favorite_game\b[\s\S]*?\$\$;/i,
    );
    expect(match).not.toBeNull();
    const body = match?.[0].toLowerCase() ?? '';
    expect(body).toContain('p_ruleset_preset text default null');
    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
    expect(body).toContain('assert_family_group_member(');
    expect(body).toContain('unsupported house-rule preset for game');
    expect(body).toContain('on conflict (group_id, game_key)');
  });

  it('revokes the 3-arg RPC from public and grants it to authenticated', () => {
    expect(schema).toMatch(
      /revoke all on function public\.add_family_favorite_game\(uuid, text, text\)[\s\S]*?from public/i,
    );
    expect(schema).toMatch(
      /grant execute on function public\.add_family_favorite_game\(uuid, text, text\)[\s\S]*?to authenticated/i,
    );
  });
});
