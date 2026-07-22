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
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-surface-primary p-5 shadow-lg">
      <h2 className="text-lg font-black text-action-primary">{t.t('rematch.title')}</h2>

      <p className="text-sm font-bold text-brand-accent" aria-live="polite">
        {counting
          ? t.format('rematch.countdown', { seconds: countdownSeconds })
          : t.format('rematch.readyCount', {
              ready: derived.readyCount,
              total: derived.eligibleCount,
            })}
      </p>

      <ul className="flex flex-col gap-2">
        {players.map((player) => (
          <li
            key={player.playerId}
            className="flex items-center justify-between gap-3 rounded-xl bg-background-canvas px-3 py-2"
          >
            <span className="truncate text-sm font-bold text-text-primary">
              {player.playerId === viewerId ? t.t('rematch.you') : player.displayName}
            </span>
            <span
              className={[
                'rounded-full px-2 py-0.5 text-xs font-black',
                player.vote === 'ready'
                  ? 'bg-brand-accent/15 text-brand-accent'
                  : 'bg-action-primary/10 text-action-primary/70',
              ].join(' ')}
            >
              {t.t(`rematch.status.${player.vote}` as MessageKey)}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={viewer?.vote === 'ready'}
          onClick={() => onVote('ready')}
          className="min-h-12 rounded-xl bg-action-primary px-4 text-sm font-black text-text-onBrand transition active:scale-[0.99] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t.t('rematch.imIn')}
        </button>
        <button
          type="button"
          onClick={() => onVote('left')}
          className="min-h-12 rounded-xl border border-action-primary/25 px-4 text-sm font-black text-action-primary transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t.t('rematch.leave')}
        </button>
      </div>
    </div>
  );
}
