import type { Card } from '@lazy-patta/game-contracts';
import type { Locale, MessageKey } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { fanCardStyle, useHandLayout } from '../../../lib/hand-layout';
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

/**
 * The human hand as an overlapping curved fan anchored in the bottom thumb zone.
 * Cards lift on hover; a freshly drawn card enters with a curved motion. Only
 * the human's own cards are ever rendered face-up — opponent identities never
 * reach this component. The rail measures itself and overlaps cards just enough
 * to avoid horizontal scrolling or clipping on small screens.
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
      <div
        className="flex min-h-24 items-center justify-center"
        aria-label={t('computer.yourHand')}
      >
        <span className="rounded-full bg-background-canvas/85 px-4 py-2 text-sm font-semibold text-action-primary">
          {t('computer.handEmpty')}
        </span>
      </div>
    );
  }

  const { ref, layout } = useHandLayout(cards.length, largeCards);

  return (
    <div
      ref={ref}
      className="gc-hand-rail flex w-[min(100%,calc(100vw-1rem))] max-w-full items-end justify-center overflow-hidden px-2 pb-2"
      aria-label={t('computer.yourHand')}
      data-large-cards={largeCards ? 'true' : 'false'}
    >
      <div
        className="flex items-end justify-center"
        style={{ width: `${layout.totalWidth}px`, maxWidth: '100%' }}
      >
        {cards.map((card, index) => (
          <span
            key={card.id}
            className="gc-hand-card inline-block shrink-0"
            style={fanCardStyle(index, cards.length, layout)}
            data-drawn={card.id === drawnCardId ? 'true' : 'false'}
            // Large-card mode lets a reader tap or keyboard-focus a single card
            // to bring it fully forward; normal mode keeps the row uncluttered.
            {...(largeCards ? { tabIndex: 0 } : {})}
          >
            <PlayingCard card={card} label={cardLabel(locale, card)} size={layout.size} />
          </span>
        ))}
      </div>
    </div>
  );
}
