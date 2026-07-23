import { describe, expect, it } from 'vitest';

import { resolveInstallMode } from './install-prompt';

const base = {
  hasPrompt: false,
  isIos: false,
  isStandalone: false,
  engaged: true,
  dismissed: false,
};

describe('resolveInstallMode', () => {
  it('offers the native browser prompt when the platform deferred one', () => {
    expect(resolveInstallMode({ ...base, hasPrompt: true })).toBe('browser');
  });

  it('falls back to the iOS Share step when there is no deferred prompt', () => {
    expect(resolveInstallMode({ ...base, isIos: true })).toBe('ios');
  });

  it('prefers the native prompt over the iOS step when both could apply', () => {
    expect(resolveInstallMode({ ...base, hasPrompt: true, isIos: true })).toBe('browser');
  });

  it('stays silent before the player has engaged', () => {
    expect(resolveInstallMode({ ...base, hasPrompt: true, engaged: false })).toBeNull();
    expect(resolveInstallMode({ ...base, isIos: true, engaged: false })).toBeNull();
  });

  it('never nags after dismissal', () => {
    expect(resolveInstallMode({ ...base, hasPrompt: true, dismissed: true })).toBeNull();
    expect(resolveInstallMode({ ...base, isIos: true, dismissed: true })).toBeNull();
  });

  it('stays silent once the app is already installed (standalone)', () => {
    expect(resolveInstallMode({ ...base, hasPrompt: true, isStandalone: true })).toBeNull();
    expect(resolveInstallMode({ ...base, isIos: true, isStandalone: true })).toBeNull();
  });

  it('does nothing without a prompt or an installable iOS Safari', () => {
    expect(resolveInstallMode(base)).toBeNull();
  });
});
