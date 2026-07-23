import { afterEach, describe, expect, it } from 'vitest';

import type { ComputerGameConfig } from './computer-session';
import { readLastConfig, writeLastConfig } from './last-config';

const jhabbu: ComputerGameConfig = {
  gameSlug: 'jhabbu',
  humanName: 'Dadi',
  playerCount: 5,
  difficulty: 'hard',
  reducedMotion: true,
  confirmBeforePlay: true,
  presetId: 'gujarati-family-v1',
};

afterEach(() => {
  window.localStorage.clear();
});

describe('last-config persistence', () => {
  it('round-trips a confirmed config per game', () => {
    writeLastConfig(jhabbu);
    expect(readLastConfig('jhabbu')).toEqual(jhabbu);
  });

  it('remembers the chosen house-rule preset', () => {
    writeLastConfig({ ...jhabbu, presetId: 'classic-bhabho-v1' });
    expect(readLastConfig('jhabbu')?.presetId).toBe('classic-bhabho-v1');
  });

  it('falls back to the default preset for an unknown stored id', () => {
    window.localStorage.setItem(
      'lazy-patta:mobile-last-config:v1:jhabbu',
      JSON.stringify({ ...jhabbu, presetId: 'not-a-real-preset' }),
    );
    expect(readLastConfig('jhabbu')?.presetId).toBe('gujarati-family-v1');
  });

  it('scopes memory per game slug', () => {
    writeLastConfig(jhabbu);
    expect(readLastConfig('gadha-chor')).toBeNull();
  });

  it('returns null for a missing entry', () => {
    expect(readLastConfig('kachuful')).toBeNull();
  });

  it('ignores a corrupt blob instead of throwing', () => {
    window.localStorage.setItem('lazy-patta:mobile-last-config:v1:lal-satti', '{not json');
    expect(readLastConfig('lal-satti')).toBeNull();
  });

  it('re-normalizes an out-of-range stored player count', () => {
    window.localStorage.setItem(
      'lazy-patta:mobile-last-config:v1:jhabbu',
      JSON.stringify({ ...jhabbu, playerCount: 99 }),
    );
    const restored = readLastConfig('jhabbu');
    expect(restored?.playerCount).toBe(6);
  });

  it('drops a mismatched gameSlug payload', () => {
    window.localStorage.setItem(
      'lazy-patta:mobile-last-config:v1:jhabbu',
      JSON.stringify({ ...jhabbu, gameSlug: 'gadha-chor' }),
    );
    expect(readLastConfig('jhabbu')).toBeNull();
  });
});
