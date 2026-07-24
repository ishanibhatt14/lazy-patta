import { afterEach, describe, expect, it, vi } from 'vitest';

import { playHaptic } from './haptics';

describe('playHaptic', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('vibrates with the cue pattern when enabled and supported', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });

    playHaptic('turn', true);

    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(18);
  });

  it('stays silent when disabled', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });

    playHaptic('turn', false);

    expect(vibrate).not.toHaveBeenCalled();
  });

  it('is a no-op on hardware without the Vibration API', () => {
    vi.stubGlobal('navigator', {});
    expect(() => playHaptic('turn', true)).not.toThrow();
  });

  it('swallows vibration failures so a cue never breaks play', () => {
    const vibrate = vi.fn(() => {
      throw new Error('denied');
    });
    vi.stubGlobal('navigator', { vibrate });

    expect(() => playHaptic('turn', true)).not.toThrow();
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});
