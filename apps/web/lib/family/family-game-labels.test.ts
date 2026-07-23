import { getMessages } from '@lazy-patta/localization';
import { describe, expect, it } from 'vitest';

import { type OnlineGameKey } from '../rooms/rooms-client';

import { familyGameNameKey, familyPresetLabelKey } from './family-game-labels';

const GAME_KEYS: readonly OnlineGameKey[] = ['gadha_chor', 'lal_satti', 'jhabbu', 'kachuful'];
const en = getMessages('en');

describe('familyGameNameKey', () => {
  it.each(GAME_KEYS)('resolves %s to a real localization key', (gameKey) => {
    const key = familyGameNameKey(gameKey);
    expect(en[key]).toBeTruthy();
  });

  it('maps lal_satti to its display name', () => {
    expect(en[familyGameNameKey('lal_satti')]).toBe('Lal Satti');
  });
});

describe('familyPresetLabelKey', () => {
  it('returns null when no preset is pinned', () => {
    expect(familyPresetLabelKey('lal_satti', null)).toBeNull();
    expect(familyPresetLabelKey('lal_satti', undefined)).toBeNull();
  });

  it('resolves a real preset id to a localization key that exists', () => {
    const key = familyPresetLabelKey('lal_satti', 'lal-satti-all-sevens-open');
    expect(key).not.toBeNull();
    expect(en[key as keyof typeof en]).toBeTruthy();
  });

  it('falls back to the game default label for an unknown id (never throws)', () => {
    const key = familyPresetLabelKey('jhabbu', 'not-a-real-preset');
    expect(key).not.toBeNull();
    expect(en[key as keyof typeof en]).toBeTruthy();
  });
});
