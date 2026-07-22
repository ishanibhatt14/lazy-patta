'use client';

import type { MessageKey } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import {
  deriveRematch,
  shouldRunCountdown,
  type PlayerRematchState,
  type RematchVote as Vote,
} from '../../lib/rematch/rematch-state';

import { CountdownRing } from './artwork/CountdownRing';
import { PlayerAvatar } from './artwork/PlayerAvatar';
import { WinnerBanner } from './artwork/WinnerBanner';

/**
 * Presentational rematch panel. It renders the shared, unit-tested derivation
 * ({@link deriveRematch}) — every player's status and a live "X of Y ready"
 * count — and exposes the two viewer actions ("I'm in" / "Leave table"). It owns
 * no transport: the parent supplies the current votes and handles each action,
 * keeping the server the authority for actually starting the next round.
 *
 * NOTE: there is no rematch backend yet (see rematch-state.ts). This component is
 * intentionally transport-agnostic so it can be wired to `rematch:vote` events
 * without any change here once that migration lands.
 */

/** Per-vote pill styling, keyed by the shared vote states. */
const VOTE_PILL: Record<Vote, string> = {
  ready: 'bg-brand-accent/15 text-brand-accent',
  pending: 'bg-action-secondary/15 text-action-primary/70',
  declined: 'bg-status-error/15 text-status-error',
  left: 'bg-status-error/15 text-status-error',
  disconnected: 'bg-action-primary/10 text-action-primary/60',
};

export function RematchVote({
  players,
  viewerId,
  minPlayers,
  countdownSeconds,
  t,
  onVote,
}: {
  readonly players: readonly PlayerRematchState[];
  readonly viewerId: string;
  readonly minPlayers: number;
  /** Remaining auto-start countdown, when every eligible player is ready. */
  readonly countdownSeconds?: number;
  readonly t: Translator;
  readonly onVote: (vote: Vote) => void;
}): ReactElement {
  const derived = deriveRematch(players, minPlayers);
  const viewer = players.find((p) => p.playerId === viewerId);
  const counting = shouldRunCountdown(derived) && countdownSeconds !== undefined;

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-action-secondary/30 bg-surface-primary p-5 shadow-2xl">
      <WinnerBanner eyebrow={t.t('rematch.eyebrow')} headline={t.t('rematch.title')} />

      <div
        className="flex items-center justify-center gap-3 rounded-2xl bg-background-canvas/50 px-4 py-3"
        aria-live="polite"
      >
        {counting ? <CountdownRing seconds={countdownSeconds} /> : null}
        <p className="text-sm font-black text-brand-accent">
          {counting
            ? t.format('rematch.countdown', { seconds: countdownSeconds })
            : t.format('rematch.readyCount', {
                ready: derived.readyCount,
                total: derived.eligibleCount,
              })}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {players.map((player) => {
          const isViewer = player.playerId === viewerId;
          const name = isViewer ? t.t('rematch.you') : player.displayName;
          return (
            <li
              key={player.playerId}
              className={[
                'flex items-center gap-3 rounded-xl border px-3 py-2 transition',
                player.vote === 'ready'
                  ? 'border-brand-accent/40 bg-brand-accent/10'
                  : 'border-action-secondary/15 bg-background-canvas/50',
              ].join(' ')}
            >
              <PlayerAvatar name={player.displayName} size="sm" />
              <span className="flex-1 truncate text-sm font-black text-text-primary">{name}</span>
              <span
                className={[
                  'rounded-full px-2.5 py-1 text-xs font-black',
                  VOTE_PILL[player.vote],
                ].join(' ')}
              >
                {t.t(`rematch.status.${player.vote}` as MessageKey)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={viewer?.vote === 'ready'}
          onClick={() => onVote('ready')}
          className="min-h-12 rounded-xl bg-action-primary px-4 text-sm font-black text-text-onBrand shadow-md transition active:scale-[0.99] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t.t('rematch.imIn')}
        </button>
        <button
          type="button"
          onClick={() => onVote('left')}
          className="min-h-12 rounded-xl border border-action-secondary/30 bg-background-canvas/40 px-4 text-sm font-black text-action-primary transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t.t('rematch.leave')}
        </button>
      </div>
    </div>
  );
}
