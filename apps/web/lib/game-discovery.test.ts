import { describe, expect, it } from 'vitest';

import { GAME_DISCOVERY, GAME_SLUGS, PLAYABLE_GAME_SLUGS } from './game-discovery';

describe('game discovery registry', () => {
  it('marks all three games playable now that Jhabbu has a computer mode', () => {
    expect(GAME_DISCOVERY['gadha-chor'].playable).toBe(true);
    expect(GAME_DISCOVERY['lal-satti'].playable).toBe(true);
    expect(GAME_DISCOVERY.jhabbu.playable).toBe(true);
  });

  it('keeps online play gated: Jhabbu is computer-only until family mode ships', () => {
    expect(GAME_DISCOVERY['gadha-chor'].onlinePlayable).toBe(true);
    expect(GAME_DISCOVERY['lal-satti'].onlinePlayable).toBe(true);
    expect(GAME_DISCOVERY.jhabbu.onlinePlayable).toBe(false);
  });

  it('derives PLAYABLE_GAME_SLUGS from the playable flag', () => {
    expect(PLAYABLE_GAME_SLUGS).toContain('gadha-chor');
    expect(PLAYABLE_GAME_SLUGS).toContain('lal-satti');
    expect(PLAYABLE_GAME_SLUGS).toContain('jhabbu');
  });

  it('keeps every game crawlable (Jhabbu still appears in GAME_SLUGS)', () => {
    expect(GAME_SLUGS).toContain('jhabbu');
  });

  it('gives Jhabbu SEO aliases that fold into the canonical slug', () => {
    expect(GAME_DISCOVERY.jhabbu.slugAliases).toEqual([
      'bhabho',
      'bhabhi',
      'laad',
      'get-away',
      'zabbu',
    ]);
  });
});
