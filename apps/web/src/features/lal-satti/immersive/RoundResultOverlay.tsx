import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { Button } from '../../../../components/Button';
import { AvatarPlaceholder } from '../../../../components/game/art';
import { createTranslator } from '../../../../lib/i18n';
import { LAL_SATTI_HUMAN_ID } from '../players';
import type { LalSattiViewState } from '../types';

interface RoundResultOverlayProps {
  readonly locale: Locale;
  readonly view: LalSattiViewState;
  readonly leaderName: string | null;
  readonly onRematch: () => void;
  readonly onViewScores: () => void;
}

function displayName(name: string, locale: Locale): string {
  if (name === LAL_SATTI_HUMAN_ID) return createTranslator(locale).t('computer.youName');
  return name;
}

function cardShortLabel(
  card: NonNullable<LalSattiViewState['roundScores'][number]['leftovers'][number]['cards']>[number],
): string {
  const rank =
    card.rank === 'jack'
      ? 'J'
      : card.rank === 'queen'
        ? 'Q'
        : card.rank === 'king'
          ? 'K'
          : card.rank === 'ace'
            ? 'A'
            : card.rank;
  const suit =
    card.suit === 'hearts'
      ? '♥'
      : card.suit === 'diamonds'
        ? '♦'
        : card.suit === 'clubs'
          ? '♣'
          : '♠';
  return `${rank}${suit}`;
}

/**
 * The staged end-of-round reveal: the table dims, the winner's avatar is
 * celebrated, opponents' remaining cards are counted, standings update, and the
 * running match leader is surfaced. Warm and affectionate — a family table
 * moment, never a casino payout. Offers the next round, a scores view, sharing,
 * and a way home.
 */
export function RoundResultOverlay({
  locale,
  view,
  leaderName,
  onRematch,
  onViewScores,
}: RoundResultOverlayProps): ReactElement | null {
  const { t, format } = createTranslator(locale);
  const [shareNote, setShareNote] = useState<string | null>(null);

  if (view.phase !== 'result') return null;

  const latestRound = view.roundScores.at(-1);
  const winnerLabel = view.winnerNames.map((name) => displayName(name, locale)).join(' · ');
  const firstWinner = view.winnerNames[0];
  const winnerSeat =
    view.seats.find((seat) => seat.name === firstWinner) ??
    view.seats.find((seat) => seat.isFinished) ??
    null;

  const onShare = async (): Promise<void> => {
    const text = format('lalSatti.shareResultText', { name: winnerLabel || t('computer.youName') });
    try {
      const nav = navigator as Navigator & { share?: (data: { text: string }) => Promise<void> };
      if (typeof nav.share === 'function') {
        await nav.share({ text });
        return;
      }
      await navigator.clipboard?.writeText(text);
      setShareNote(t('computer.shareCopied'));
    } catch {
      // Sharing is a nicety; never surface an error over a friendly result.
    }
  };

  return (
    <div className="ls-result absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90dvh] w-full max-w-md flex-col items-center gap-4 overflow-y-auto rounded-lg bg-surface-primary p-6 text-center shadow-md">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-accent">
          {t('lalSatti.roundComplete')}
        </p>

        {winnerSeat ? (
          <span className="ls-result-badge">
            <AvatarPlaceholder
              seatId={winnerSeat.id}
              initial={winnerSeat.avatarInitial}
              isSelf={winnerSeat.isSelf}
              size={96}
            />
          </span>
        ) : null}

        <h2 className="text-2xl font-bold text-action-primary">
          {format('lalSatti.winnerLine', { name: winnerLabel })}
        </h2>

        {leaderName ? (
          <p className="w-full rounded-md bg-brand-accent px-4 py-2 text-sm font-bold text-text-onBrand">
            {format('lalSatti.matchLeaderLine', { name: displayName(leaderName, locale) })}
          </p>
        ) : null}

        {latestRound && latestRound.leftovers.length > 0 ? (
          <div className="w-full rounded-md bg-background-canvas px-4 py-3 text-left text-sm text-text-primary">
            <p className="font-semibold text-action-primary">{t('lalSatti.leftoversTitle')}</p>
            <ul className="mt-2 space-y-1">
              {latestRound.leftovers.map((leftover) => (
                <li key={leftover.playerId}>
                  {format('lalSatti.leftoverLine', {
                    name: displayName(leftover.playerName, locale),
                    count: leftover.cardCount,
                    points: leftover.cardPoints,
                  })}
                  {leftover.cards && leftover.cards.length > 0 ? (
                    <span className="block text-xs text-text-primary">
                      {leftover.cards.map(cardShortLabel).join(' ')}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex w-full flex-wrap justify-center gap-2">
          <Button onClick={onRematch}>{t('lalSatti.nextRound')}</Button>
          <Button variant="secondary" onClick={onViewScores}>
            {t('lalSatti.viewScores')}
          </Button>
          <Button variant="ghost" onClick={() => void onShare()}>
            {t('action.shareResult')}
          </Button>
          <a
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-action-primary underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('action.returnHome')}
          </a>
        </div>

        {shareNote ? (
          <p aria-live="polite" className="text-sm font-semibold text-brand-accent">
            {shareNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
