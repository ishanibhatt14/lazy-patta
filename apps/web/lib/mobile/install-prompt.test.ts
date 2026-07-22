import { describe, expect, it } from 'vitest';

import { shouldOfferInstall } from './install-prompt';

describe('shouldOfferInstall', () => {
  it('offers only when the browser has a prompt, the player is engaged, and it is undismissed', () => {
    expect(shouldOfferInstall({ hasPrompt: true, engaged: true, dismissed: false })).toBe(true);
  });

  it('stays silent before the player has engaged', () => {
    expect(shouldOfferInstall({ hasPrompt: true, engaged: false, dismissed: false })).toBe(false);
  });

  it('never nags after dismissal', () => {
    expect(shouldOfferInstall({ hasPrompt: true, engaged: true, dismissed: true })).toBe(false);
  });

  it('does nothing without a browser prompt to defer', () => {
    expect(shouldOfferInstall({ hasPrompt: false, engaged: true, dismissed: false })).toBe(false);
  });
});
