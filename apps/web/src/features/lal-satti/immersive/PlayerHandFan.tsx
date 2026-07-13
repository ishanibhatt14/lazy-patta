import type { Card } from '@lazy-patta/game-contracts';
import type { Locale } from '@lazy-patta/localization';
import type { CSSProperties, ReactElement } from 'react';

import { PlayingCard } from '../../../../components/PlayingCard';
import { createTranslator } from '../../../../lib/i18n';

import { cardLabel } from './shared';

interface PlayerHandFanProps {
  readonly locale: Locale;
  readonly cards: readonly Card[];
  readonly playableCardIds: readonly string[];
  readonly isHumanTurn: boolean;
  readonly focusedCardId?: string | null;
  readonly invalidCardId?: string | null;
  readonly largeCards?: boolean;
  /** Playable card tapped → play it; non-playable tapped → gentle shake + hint. */
  readonly onSelect: (card: Card) => void;
  /** Hover/focus a card to preview its destination lane (null clears preview). */
  readonly onFocusCard: (card: Card | null) => void;
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
 * Playable cards rise with a restrained haldi outline; non-playable cards stay
 * readable. Tapping a playable card plays it; tapping a non-playable card asks
 * the shell for a gentle shake and a short rule hint. Large-card mode swaps the
 * fan for a scrollable row of bigger cards with reduced overlap.
 */
export function PlayerHandFan({
  locale,
  cards,
  playableCardIds,
  isHumanTurn,
  focusedCardId = null,
  invalidCardId = null,
  largeCards = false,
  onSelect,
  onFocusCard,
}: PlayerHandFanProps): ReactElement {
  const { t, format } = createTranslator(locale);

  if (cards.length === 0) {
    return (
      <div className="flex min-h-24 items-center justify-center" aria-label={t('lalSatti.yourCards')}>
        <span className="rounded-full bg-[color-mix(in_srgb,var(--lp-background-canvas)_85%,transparent)] px-4 py-2 text-sm font-semibold text-action-primary">
          {t('label.finished')}
        </span>
      </div>
    );
  }

  const renderCard = (card: Card, style?: CSSProperties, overlap = false): ReactElement => {
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
          overlap ? '-ml-3 first:ml-0 inline-block' : 'shrink-0',
          playable ? '' : 'opacity-70',
        ].join(' ')}
        style={style}
        data-playable={playable ? 'true' : 'false'}
        data-focused={card.id === focusedCardId ? 'true' : 'false'}
        data-invalid={card.id === invalidCardId ? 'true' : 'false'}
        onClick={() => onSelect(card)}
        onMouseEnter={() => onFocusCard(card)}
        onMouseLeave={() => onFocusCard(null)}
        onFocus={() => onFocusCard(card)}
        onBlur={() => onFocusCard(null)}
      >
        <PlayingCard card={card} size={largeCards ? 'lg' : 'md'} label={label} />
      </button>
    );
  };

  if (largeCards) {
    return (
      <div
        className="flex w-full max-w-full items-end gap-2 overflow-x-auto px-2 pb-1"
        aria-label={t('lalSatti.yourCards')}
      >
        {cards.map((card) => renderCard(card))}
      </div>
    );
  }

  return (
    <div
      className="flex max-w-full items-end justify-center overflow-x-auto px-2"
      aria-label={t('lalSatti.yourCards')}
    >
      <div className="flex items-end">
        {cards.map((card, index) => renderCard(card, fanTransform(index, cards.length), true))}
      </div>
    </div>
  );
}
