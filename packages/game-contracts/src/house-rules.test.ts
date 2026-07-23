import { describe, expect, it } from 'vitest';

import {
  HOUSE_RULE_GAME_SLUGS,
  REGIONAL_PRESETS,
  defaultPresetFor,
  isKnownPreset,
  presetsFor,
  resolvePreset,
  type HouseRuleGameSlug,
} from './house-rules';

describe('regional preset registry', () => {
  it('registers presets for every house-rule game', () => {
    for (const slug of HOUSE_RULE_GAME_SLUGS) {
      expect(presetsFor(slug).length).toBeGreaterThan(0);
    }
  });

  it('exposes exactly one default per game', () => {
    for (const slug of HOUSE_RULE_GAME_SLUGS) {
      const defaults = presetsFor(slug).filter((preset) => preset.isDefault);
      expect(defaults).toHaveLength(1);
    }
  });

  it('tags every preset with its own game slug', () => {
    for (const slug of HOUSE_RULE_GAME_SLUGS) {
      for (const preset of presetsFor(slug)) {
        expect(preset.gameSlug).toBe(slug);
      }
    }
  });

  it('keeps preset ids unique within a game', () => {
    for (const slug of HOUSE_RULE_GAME_SLUGS) {
      const ids = presetsFor(slug).map((preset) => preset.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('surfaces only the engine-backed variant ids (honest status)', () => {
    const ids = HOUSE_RULE_GAME_SLUGS.flatMap((slug) =>
      presetsFor(slug).map((preset) => preset.id),
    );
    expect(ids.sort()).toEqual(
      [
        'classic-bhabho-v1',
        'classic-gulam-chor',
        'family-descending-v1',
        'gujarati-family-v1',
        'lal-satti-all-sevens-open',
        'lal-satti-classic-seven-of-hearts',
      ].sort(),
    );
  });

  it('resolves a known preset id to that preset', () => {
    expect(resolvePreset('lal-satti', 'lal-satti-all-sevens-open').id).toBe(
      'lal-satti-all-sevens-open',
    );
  });

  it('falls back to the default for unknown or missing ids', () => {
    expect(resolvePreset('jhabbu', 'not-a-real-preset').id).toBe(defaultPresetFor('jhabbu').id);
    expect(resolvePreset('jhabbu', null).id).toBe(defaultPresetFor('jhabbu').id);
    expect(resolvePreset('jhabbu', undefined).id).toBe(defaultPresetFor('jhabbu').id);
  });

  it('reports preset membership per game', () => {
    expect(isKnownPreset('gadha-chor', 'classic-gulam-chor')).toBe(true);
    expect(isKnownPreset('gadha-chor', 'lal-satti-all-sevens-open')).toBe(false);
  });

  it('covers every registry key with the slug union', () => {
    expect(Object.keys(REGIONAL_PRESETS).sort()).toEqual([...HOUSE_RULE_GAME_SLUGS].sort());
  });

  it('throws only when a game has no default (guarded by construction)', () => {
    const slug = 'gadha-chor' satisfies HouseRuleGameSlug;
    expect(() => defaultPresetFor(slug)).not.toThrow();
  });
});
