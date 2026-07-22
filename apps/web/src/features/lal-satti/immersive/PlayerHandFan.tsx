import type { Card } from '@lazy-patta/game-contracts';
import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { PlayingCard } from '../../../../components/PlayingCard';
import { fanCardStyle, useHandLayout } from '../../../../lib/hand-layout';
import { createTranslator } from '../../../../lib/i18n';

import { cardLabel } from './shared';

interface PlayerHandFanProps {
  readonly locale: Locale;
  readonly cards: readonly Card[];
  readonly playableCardIds: readonly string[];
  readonly isHumanTurn: boolean;
  readonly focusedCardId?: string | null;
  readonly invalidCardId?: string | null;
  /** Confirm-before-play: the card lined up, awaiting a second tap to commit. */
  readonly armedCardId?: string | null;
  readonly largeCards?: boolean;
  /** Playable card tapped → play it; non-playable tapped → gentle shake + hint. */
  readonly onSelect: (card: Card) => void;
  /** Hover/focus a card to preview its destination lane (null clears preview). */
  readonly onFocusCard: (card: Card | null) => void;
}

/**
 * The human hand as an overlapping curved fan anchored in the bottom thumb zone.
 * Playable cards rise with a restrained haldi outline; non-playable cards stay
 * readable. Tapping a playable card plays it; tapping a non-playable card asks
 * the shell for a gentle shake and a short rule hint. The rail measures itself
 * and overlaps cards just enough to avoid horizontal scrolling or clipping.
 */
export function PlayerHandFan({
  locale,
  cards,
  playableCardIds,
  isHumanTurn,
  focusedCardId = null,
  invalidCardId = null,
  armedCardId = null,
  largeCards = false,
  onSelect,
  onFocusCard,
}: PlayerHandFanProps): ReactElement {
  const { t, format } = createTranslator(locale);

  if (cards.length === 0) {
    return (
      <div
        className="flex min-h-24 items-center justify-center"
        aria-label={t('lalSatti.yourCards')}
      >
        <span className="rounded-full bg-[color-mix(in_srgb,var(--lp-background-canvas)_85%,transparent)] px-4 py-2 text-sm font-semibold text-action-primary">
          {t('label.finished')}
        </span>
      </div>
    );
  }

  const { ref, layout } = useHandLayout(cards.length, largeCards);

  const renderCard = (card: Card, index: number): ReactElement => {
    const playable = playableCardIds.includes(card.id);
    const label = cardLabel(card, locale);
    return (
      <button
        key={card.id}
        type="button"
        disabled={!isHumanTurn}
        aria-label={
          playable
            ? format('lalSatti.playCardLabel', { card: label })
            : format('lalSatti.cardNotPlayable', { card: label })
        }
        className={[
          'ls-hand-card rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
          'inline-block shrink-0',
          playable ? '' : 'opacity-70',
        ].join(' ')}
        style={fanCardStyle(index, cards.length, layout)}
        data-playable={playable ? 'true' : 'false'}
        data-focused={card.id === focusedCardId ? 'true' : 'false'}
        data-invalid={card.id === invalidCardId ? 'true' : 'false'}
        data-armed={card.id === armedCardId ? 'true' : 'false'}
        onClick={() => onSelect(card)}
        onMouseEnter={() => onFocusCard(card)}
        onMouseLeave={() => onFocusCard(null)}
        onFocus={() => onFocusCard(card)}
        onBlur={() => onFocusCard(null)}
      >
        <PlayingCard card={card} size={layout.size} label={label} />
      </button>
    );
  };

  return (
    <div
      ref={ref}
      className="ls-hand-rail flex w-[min(100%,calc(100vw-1rem))] max-w-full items-end justify-center overflow-hidden px-2 pb-2"
      aria-label={t('lalSatti.yourCards')}
      data-large-cards={largeCards ? 'true' : 'false'}
    >
      <div
        className="flex items-end justify-center"
        style={{ width: `${layout.totalWidth}px`, maxWidth: '100%' }}
      >
        {cards.map((card, index) => renderCard(card, index))}
      </div>
    </div>
  );
}
