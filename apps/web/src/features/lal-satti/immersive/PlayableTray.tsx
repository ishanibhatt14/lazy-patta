import type { Card } from '@lazy-patta/game-contracts';
import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { PlayingCard } from '../../../../components/PlayingCard';
import { createTranslator } from '../../../../lib/i18n';

import { cardLabel } from './shared';

interface PlayableTrayProps {
  readonly locale: Locale;
  readonly cards: readonly Card[];
  readonly playableCardIds: readonly string[];
  readonly isHumanTurn: boolean;
  /** Play the tapped card immediately (tray only ever shows playable cards). */
  readonly onSelect: (card: Card) => void;
  /** Mirror the fan's lane preview when a tray card is hovered/focused. */
  readonly onFocusCard: (card: Card | null) => void;
}

/**
 * A thumb-zone shortcut row that surfaces ONLY the cards the human can legally
 * play this turn, as big, fully-spaced, non-overlapping tap targets. On a phone
 * the 13-card fan overlaps into ~22px slivers, so hunting for the one playable
 * card is fiddly; this tray makes the actual choice a handful of comfortable
 * buttons. It renders nothing when it is not the human's turn or nothing is
 * playable (a forced pass), leaving the fan as the sole affordance.
 */
export function PlayableTray({
  locale,
  cards,
  playableCardIds,
  isHumanTurn,
  onSelect,
  onFocusCard,
}: PlayableTrayProps): ReactElement | null {
  const { t, format } = createTranslator(locale);

  if (!isHumanTurn) return null;

  // Preserve hand order so a tray card sits roughly above its fan sibling.
  const playable = cards.filter((card) => playableCardIds.includes(card.id));
  if (playable.length === 0) return null;

  return (
    <div className="ls-play-tray" aria-label={t('lalSatti.tapToPlay')}>
      <p className="ls-play-tray-title">{t('lalSatti.tapToPlay')}</p>
      <div className="ls-play-tray-row" role="group" aria-label={t('lalSatti.tapToPlay')}>
        {playable.map((card) => {
          const label = cardLabel(card, locale);
          return (
            <button
              key={card.id}
              type="button"
              className="ls-play-tray-card rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
              aria-label={format('lalSatti.playCardLabel', { card: label })}
              onClick={() => onSelect(card)}
              onMouseEnter={() => onFocusCard(card)}
              onMouseLeave={() => onFocusCard(null)}
              onFocus={() => onFocusCard(card)}
              onBlur={() => onFocusCard(null)}
            >
              <PlayingCard card={card} size="md" label={label} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
