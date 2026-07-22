import { describe, expect, it } from 'vitest';

import { resolveCardTap } from './play-interaction';

const base = {
  cardId: 'c1',
  isHumanTurn: true,
  playableCardIds: ['c1', 'c2'],
  confirmBeforePlay: false,
  armedCardId: null,
} as const;

describe('resolveCardTap', () => {
  it('ignores taps when it is not the human turn', () => {
    expect(resolveCardTap({ ...base, isHumanTurn: false })).toEqual({ kind: 'ignore' });
  });

  it('flags a card that is not currently playable', () => {
    expect(resolveCardTap({ ...base, cardId: 'c9' })).toEqual({ kind: 'invalid' });
  });

  it('commits immediately when confirm-before-play is off', () => {
    expect(resolveCardTap(base)).toEqual({ kind: 'commit', cardId: 'c1' });
  });

  it('arms on the first tap when confirm-before-play is on', () => {
    expect(resolveCardTap({ ...base, confirmBeforePlay: true })).toEqual({
      kind: 'arm',
      cardId: 'c1',
    });
  });

  it('commits on the second tap of the armed card', () => {
    expect(resolveCardTap({ ...base, confirmBeforePlay: true, armedCardId: 'c1' })).toEqual({
      kind: 'commit',
      cardId: 'c1',
    });
  });

  it('re-arms when a different card is tapped', () => {
    expect(
      resolveCardTap({ ...base, cardId: 'c2', confirmBeforePlay: true, armedCardId: 'c1' }),
    ).toEqual({ kind: 'arm', cardId: 'c2' });
  });

  it('still rejects an illegal card even while another is armed', () => {
    expect(
      resolveCardTap({ ...base, cardId: 'c9', confirmBeforePlay: true, armedCardId: 'c1' }),
    ).toEqual({ kind: 'invalid' });
  });
});
