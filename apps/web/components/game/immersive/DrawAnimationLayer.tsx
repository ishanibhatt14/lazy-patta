import type { Card } from '@lazy-patta/game-contracts';
import type { Locale, MessageKey } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import type { DrawReveal } from '../../../lib/computer-game/types';
import { createTranslator } from '../../../lib/i18n';
import { PlayingCard } from '../../PlayingCard';

interface DrawAnimationLayerProps {
  readonly locale: Locale;
  readonly draw: DrawReveal;
  readonly reducedMotion: boolean;
}

function cardLabel(locale: Locale, card: Card): string {
  const { t, format } = createTranslator(locale);
  const rank = t(`rank.${card.rank}` as MessageKey);
  const suit = t(`suit.${card.suit}` as MessageKey);
  return format('card.accessibleFace', { rank, suit });
}

/**
 * Reveals the human's own draw travelling to their hand. Only the human's own
 * drawn card is ever shown — bot draws carry no identity, so there is nothing
 * to render for them. Keeps the .computer-pair-animation/.computer-pair-reduced
 * hooks so reduced motion swaps the pop for a fade.
 */
export function DrawAnimationLayer({
  locale,
  draw,
  reducedMotion,
}: DrawAnimationLayerProps): ReactElement | null {
  const { t } = createTranslator(locale);
  if (!draw.actorIsSelf || !draw.drawnCard) return null;

  return (
    <div className={reducedMotion ? 'computer-pair-reduced' : 'computer-pair-animation'}>
      {draw.pairRemoved && draw.matchedCard ? (
        <PlayingCard
          card={draw.matchedCard}
          label={cardLabel(locale, draw.matchedCard)}
          size="sm"
        />
      ) : null}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-action-secondary">
          {t('computer.drawnCardLabel')}
        </span>
        <PlayingCard card={draw.drawnCard} label={cardLabel(locale, draw.drawnCard)} size="sm" />
      </div>
      {draw.pairRemoved ? (
        <>
          <span className="text-sm font-bold text-action-secondary">{t('game.jodiMaliGai')}</span>
          <span className="computer-bandhani-dot computer-bandhani-dot--one" aria-hidden />
          <span className="computer-bandhani-dot computer-bandhani-dot--two" aria-hidden />
          <span className="computer-bandhani-dot computer-bandhani-dot--three" aria-hidden />
        </>
      ) : null}
    </div>
  );
}
