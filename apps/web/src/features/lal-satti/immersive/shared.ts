import type { Card } from '@lazy-patta/game-contracts';
import type { Locale, MessageKey } from '@lazy-patta/localization';

import { createTranslator } from '../../../../lib/i18n';
import type { LalSattiSeatView } from '../types';

export type SeatPosition = 'top' | 'left' | 'right' | 'bottom';

export interface PositionedSeat extends LalSattiSeatView {
  readonly position: SeatPosition;
}

/**
 * Lal Satti seats carry no fixed geometry (unlike Gadha's), so the immersive
 * layer assigns table positions here: the human always anchors the bottom, and
 * the bots wrap the rim — first to the left, last to the right, the rest across
 * the top. This is presentation only; turn order and identities are untouched.
 */
export function positionSeats(seats: readonly LalSattiSeatView[]): readonly PositionedSeat[] {
  const self = seats.find((seat) => seat.isSelf);
  const bots = seats.filter((seat) => !seat.isSelf);

  const positioned: PositionedSeat[] = [];
  if (self) positioned.push({ ...self, position: 'bottom' });

  bots.forEach((seat, index) => {
    let position: SeatPosition;
    if (bots.length === 1) {
      position = 'top';
    } else if (index === 0) {
      position = 'left';
    } else if (index === bots.length - 1) {
      position = 'right';
    } else {
      position = 'top';
    }
    positioned.push({ ...seat, position });
  });

  return positioned;
}

export function rankKey(rank: Card['rank']): MessageKey {
  return `rank.${rank}` as MessageKey;
}

export function suitKey(suit: Card['suit']): MessageKey {
  return `suit.${suit}` as MessageKey;
}

/** Localized "Rank of Suit" accessible name for a single card. */
export function cardLabel(card: Card, locale: Locale): string {
  const { t, format } = createTranslator(locale);
  return format('card.accessibleFace', {
    rank: t(rankKey(card.rank)),
    suit: t(suitKey(card.suit)),
  });
}
