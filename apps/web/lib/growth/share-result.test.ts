import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTranslator } from '../i18n';

import type { GrowthEvent } from './analytics';
import type { ShareableGameResult } from './results';
import { shareGameResult } from './share-result';

const sample: ShareableGameResult = {
  gameSlug: 'kachuful',
  gameName: 'Kachuful',
  headline: 'Ba won Kachuful on Lazy Patta',
  winnerDisplayName: 'Ba',
  playerCount: 4,
  shareUrl: 'https://lazypatta.com',
};

function captureGrowthEvents(): GrowthEvent[] {
  const events: GrowthEvent[] = [];
  window.addEventListener('lazy-patta:growth-event', (event) => {
    events.push((event as CustomEvent<GrowthEvent>).detail);
  });
  return events;
}

describe('shareGameResult', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses the native share sheet and records the share once it lands', async () => {
    const t = createTranslator('en');
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    const events = captureGrowthEvents();

    const outcome = await shareGameResult(sample, t);

    expect(outcome).toBe('shared');
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0]![0].text).toContain('Ba');
    expect(events).toContainEqual({
      name: 'result_shared',
      gameSlug: 'kachuful',
      method: 'native',
    });
  });

  it('falls back to the clipboard and records a copy-link share', async () => {
    const t = createTranslator('en');
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const events = captureGrowthEvents();

    const outcome = await shareGameResult(sample, t);

    expect(outcome).toBe('copied');
    expect(writeText).toHaveBeenCalledOnce();
    expect(events).toContainEqual({
      name: 'result_shared',
      gameSlug: 'kachuful',
      method: 'copy-link',
    });
  });

  it('never throws and records nothing when the share is cancelled', async () => {
    const t = createTranslator('en');
    const share = vi.fn().mockRejectedValue(new Error('AbortError'));
    vi.stubGlobal('navigator', { share });
    const events = captureGrowthEvents();

    const outcome = await shareGameResult(sample, t);

    expect(outcome).toBe('unavailable');
    expect(events).toHaveLength(0);
  });
});
