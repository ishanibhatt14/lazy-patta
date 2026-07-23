import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ComputerGameInitializer,
  ComputerGameSessionService,
  normalizeComputerGameConfig,
  validateComputerGameConfig,
  type ComputerGameConfig,
} from './computer-session';

const config: ComputerGameConfig = {
  gameSlug: 'kachuful',
  humanName: '  Aanya   Bhatt  ',
  playerCount: 99,
  difficulty: 'hard',
  reducedMotion: true,
  confirmBeforePlay: false,
};

describe('ComputerGameSessionService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('normalizes and validates game configuration', () => {
    expect(normalizeComputerGameConfig(config)).toMatchObject({
      gameSlug: 'kachuful',
      humanName: 'Aanya Bhatt',
      playerCount: 7,
      difficulty: 'hard',
    });
    expect(() =>
      normalizeComputerGameConfig({ ...config, gameSlug: 'gadha-chor', difficulty: 'hard' }),
    ).not.toThrow();
  });

  it('resolves a valid house-rule preset and defaults an unknown one', () => {
    expect(
      normalizeComputerGameConfig({
        ...config,
        gameSlug: 'lal-satti',
        playerCount: 4,
        presetId: 'lal-satti-all-sevens-open',
      }).presetId,
    ).toBe('lal-satti-all-sevens-open');

    expect(
      normalizeComputerGameConfig({
        ...config,
        gameSlug: 'lal-satti',
        playerCount: 4,
        presetId: 'not-a-real-preset',
      }).presetId,
    ).toBe('lal-satti-classic-seven-of-hearts');
  });

  it('rejects a config carrying a preset id from another game', () => {
    expect(() =>
      validateComputerGameConfig({
        ...config,
        gameSlug: 'lal-satti',
        playerCount: 4,
        presetId: 'gujarati-family-v1',
      }),
    ).toThrow(/preset/i);
  });

  it('creates and restores a versioned local computer session', async () => {
    const service = new ComputerGameSessionService();
    const session = await service.create(config, { seed: 'seed-1' });

    await expect(service.load(session.sessionId)).resolves.toMatchObject({
      schemaVersion: 1,
      gameSlug: 'kachuful',
      status: 'playing',
      seed: 'seed-1',
      config: { playerCount: 7 },
    });
  });

  it('returns null for malformed persisted sessions', async () => {
    window.localStorage.setItem('lazy-patta:mobile-computer-session:v1:bad', '{nope');
    const service = new ComputerGameSessionService();

    await expect(service.load('bad')).resolves.toBeNull();
  });
});

describe('ComputerGameInitializer', () => {
  it('reuses an in-flight promise for duplicate request ids', async () => {
    const service = new ComputerGameSessionService();
    const create = vi.spyOn(service, 'create');
    const initializer = new ComputerGameInitializer(service);

    const first = initializer.start(config, 'same-request');
    const second = initializer.start(config, 'same-request');

    await expect(first).resolves.toBe(await second);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
