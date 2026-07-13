import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import type { ComputerGameSeat } from '../../../lib/computer-game/types';
import { createTranslator } from '../../../lib/i18n';
import { AvatarPlaceholder, BandhaniCardBackPlaceholder, type ReactionKind } from '../art';

import { ActiveTurnRing } from './ActiveTurnRing';
import { ReactionBubble } from './ReactionBubble';

interface PlayerPodProps {
  readonly locale: Locale;
  readonly seat: ComputerGameSeat;
  readonly reaction?: { readonly kind: ReactionKind; readonly text: string } | null;
}

/**
 * A player seat around the table rim: avatar, name, card-count badge, animated
 * active-turn ring, finished state, and an optional short reaction bubble. The
 * ring is color-only, so an active pod also carries a textual "current turn"
 * marker for non-color and screen-reader users.
 */
export function PlayerPod({ locale, seat, reaction = null }: PlayerPodProps): ReactElement {
  const { t, format } = createTranslator(locale);
  const displayName = seat.isSelf ? t('computer.youName') : seat.name;
  const backs = Math.min(seat.cardCount, 4);

  const countLabel = seat.isFinished
    ? t('label.finished')
    : format('game.cardsRemainingCount', { count: seat.cardCount });

  return (
    <div
      className="relative flex flex-col items-center gap-1 text-center"
      data-seat-id={seat.id}
      data-active={seat.isActive ? 'true' : 'false'}
    >
      {reaction ? <ReactionBubble kind={reaction.kind} text={reaction.text} /> : null}

      <ActiveTurnRing active={seat.isActive}>
        <AvatarPlaceholder seatId={seat.id} initial={seat.avatarInitial} isSelf={seat.isSelf} />
      </ActiveTurnRing>

      <span className="max-w-[6.5rem] truncate text-sm font-bold text-text-onBrand drop-shadow-sm">
        {displayName}
      </span>

      {!seat.isSelf && !seat.isFinished ? (
        <span className="gc-pod-backs flex h-6 items-end" aria-hidden>
          {Array.from({ length: backs }).map((_, index) => (
            <BandhaniCardBackPlaceholder
              key={index}
              className="-ml-2.5 first:ml-0 h-6 w-4 shrink-0"
            />
          ))}
        </span>
      ) : null}

      <span
        className={[
          'rounded-full px-2 py-0.5 text-xs font-semibold',
          seat.isFinished
            ? 'bg-brand-accent text-text-onBrand'
            : 'bg-background-canvas/85 text-action-primary',
        ].join(' ')}
      >
        {countLabel}
      </span>

      {seat.isActive ? (
        <span className="flex items-center gap-1 text-xs font-bold text-action-secondary">
          <span aria-hidden>●</span>
          {t('computer.activeTurnMarker')}
        </span>
      ) : null}
    </div>
  );
}
