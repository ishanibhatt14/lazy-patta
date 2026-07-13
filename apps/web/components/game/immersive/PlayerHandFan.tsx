import type { Card } from '@lazy-patta/game-contracts';
import type { Locale, MessageKey } from '@lazy-patta/localization';
import type { CSSProperties, ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';
import { PlayingCard } from '../../PlayingCard';

interface PlayerHandFanProps {
  readonly locale: Locale;
  readonly cards: readonly Card[];
  /** Id of a card the human just drew, animated in with a curved entrance. */
  readonly drawnCardId?: string | null;
  /** Accessibility mode: larger cards in a scrollable row, no tight overlap. */
  readonly largeCards?: boolean;
}

function cardLabel(locale: Locale, card: Card): string {
  const { t, format } = createTranslator(locale);
  const rank = t(`rank.${card.rank}` as MessageKey);
  const suit = t(`suit.${card.suit}` as MessageKey);
  return format('card.accessibleFace', { rank, suit });
}

function fanTransform(index: number, count: number): CSSProperties {
  if (count <= 1) return { transform: 'none' };
  const mid = (count - 1) / 2;
  const step = Math.min(5, 44 / count);
  const angle = (index - mid) * step;
  const arc = Math.abs(index - mid) * 0.14;
  return { transform: `rotate(${angle}deg) translateY(${arc}rem)`, transformOrigin: 'bottom center' };
}

/**
 * The human hand as an overlapping curved fan anchored in the bottom thumb zone.
 * Cards lift on hover; a freshly drawn card enters with a curved motion. Only
 * the human's own cards are ever rendered face-up — opponent identities never
 * reach this component. Large-card mode swaps the fan for a scrollable row of
 * bigger cards; overflow is scrollable within the track, never on the page.
 */
export function PlayerHandFan({
  locale,
  cards,
  drawnCardId = null,
  largeCards = false,
}: PlayerHandFanProps): ReactElement {
  const { t } = createTranslator(locale);

  if (cards.length === 0) {
    return (
      <div className="flex min-h-24 items-center justify-center" aria-label={t('computer.yourHand')}>
        <span className="rounded-full bg-background-canvas/85 px-4 py-2 text-sm font-semibold text-action-primary">
          {t('computer.handEmpty')}
        </span>
      </div>
    );
  }

  if (largeCards) {
    return (
      <div
        className="flex w-full max-w-full items-end gap-2 overflow-x-auto px-2 pb-1"
        aria-label={t('computer.yourHand')}
      >
        {cards.map((card) => (
          <span
            key={card.id}
            className="gc-hand-card shrink-0"
            data-drawn={card.id === drawnCardId ? 'true' : 'false'}
          >
            <PlayingCard card={card} label={cardLabel(locale, card)} size="lg" />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex max-w-full items-end justify-center overflow-x-auto px-2"
      aria-label={t('computer.yourHand')}
    >
      <div className="flex items-end">
        {cards.map((card, index) => (
          <span
            key={card.id}
            className="gc-hand-card -ml-3 first:ml-0 inline-block"
            style={fanTransform(index, cards.length)}
            data-drawn={card.id === drawnCardId ? 'true' : 'false'}
          >
            <PlayingCard card={card} label={cardLabel(locale, card)} size="md" />
          </span>
        ))}
      </div>
    </div>
  );
}
