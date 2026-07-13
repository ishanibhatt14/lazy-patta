'use client';

import type { Card, PublicPlayerView } from '@lazy-patta/game-contracts';
import { mintPositionToken } from '@lazy-patta/game-engine';
import type { Locale } from '@lazy-patta/localization';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import {
  drawCard,
  fetchLatestGame,
  fetchMyHand,
  type GameRow,
} from '../../lib/online-game/games-client';
import type { RoomSeat } from '../../lib/rooms/rooms-client';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';
import { PlayingCard } from '../PlayingCard';

/**
 * Live game surface. Renders the authoritative public snapshot (seat counts,
 * whose turn) plus the viewer's own hand, and — on the viewer's turn — the target
 * player's hidden cards as draw buttons. All truth comes from the server: this
 * component only reads (snapshot + own hand via RLS) and POSTs draws to the
 * authority route. It never sees another player's cards. Classic Gadha Chor deals
 * clockwise, so the draw target is the next active seat after the current player.
 */

const POLL_MS = 2000;
const CLOCKWISE_STEP = 1;

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function newActionId(): string {
  const maybeUuid = globalThis.crypto?.randomUUID?.();
  return maybeUuid ?? `act-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** The next active player clockwise from `currentId` — the draw source. */
function drawTarget(
  players: readonly PublicPlayerView[],
  currentId: string | null,
): PublicPlayerView | null {
  if (!currentId) return null;
  const n = players.length;
  const cur = players.findIndex((p) => p.id === currentId);
  if (cur < 0) return null;
  for (let i = 1; i < n; i += 1) {
    const idx = (((cur + CLOCKWISE_STEP * i) % n) + n) % n;
    if (players[idx]!.status === 'active') return players[idx]!;
  }
  return null;
}

export interface GameBoardProps {
  readonly roomId: string;
  readonly seats: readonly RoomSeat[];
  readonly userId: string;
  readonly locale: Locale;
}

export function GameBoard({ roomId, seats, userId, locale }: GameBoardProps): ReactElement {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [game, setGame] = useState<GameRow | null>(null);
  const [hand, setHand] = useState<readonly Card[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const nameFor = useCallback(
    (playerId: string): string => {
      const seat = seats.find((s) =>
        s.occupant === 'human' ? s.user_id === playerId : `bot:${s.seat_index}` === playerId,
      );
      if (playerId === userId) return t.t('rooms.you');
      return seat?.display_name ?? t.t('rooms.seatPlayer');
    },
    [seats, userId, t],
  );

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const client = getSupabaseBrowserClient();
      const latest = await fetchLatestGame(client, roomId);
      setGame(latest);
      setHand(latest ? await fetchMyHand(client, latest.id, userId) : []);
    } catch (caught) {
      setError(messageFor(caught, t.t('rooms.errorGeneric')));
    }
  }, [roomId, userId, t]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const snapshot = game?.public_snapshot;
  const isActive = game?.status === 'active';
  const isMyTurn = Boolean(isActive && snapshot?.currentPlayerId === userId);
  const target = snapshot ? drawTarget(snapshot.players, snapshot.currentPlayerId) : null;

  const onDraw = useCallback(
    async (positionToken: string): Promise<void> => {
      if (!game || busy) return;
      setBusy(true);
      setError(undefined);
      try {
        await drawCard(getSupabaseBrowserClient(), game.id, {
          clientActionId: newActionId(),
          positionToken,
          expectedVersion: game.state_version,
        });
      } catch (caught) {
        setError(messageFor(caught, t.t('rooms.errorGeneric')));
      } finally {
        await refresh();
        setBusy(false);
      }
    },
    [game, busy, refresh, t],
  );

  if (!game || !snapshot) {
    return (
      <p className="rounded-md bg-surface-primary px-4 py-3 text-center text-sm text-text-primary shadow-sm">
        {t.t('rooms.waitingToStart')}
      </p>
    );
  }

  const result = game.result;

  return (
    <div className="flex w-full flex-col gap-5">
      <ul className="flex flex-col gap-2">
        {snapshot.players.map((player) => {
          const isTurn = isActive && snapshot.currentPlayerId === player.id;
          return (
            <li
              key={player.id}
              className={`flex items-center justify-between gap-3 rounded-md px-4 py-2 shadow-sm ${
                isTurn ? 'bg-action-primary/10 ring-1 ring-action-primary' : 'bg-surface-primary'
              }`}
            >
              <span className="text-sm font-medium text-text-primary">
                {nameFor(player.id)}
                {player.status === 'finished' ? ` · ${t.t('rooms.playerSafe')}` : ''}
              </span>
              <span className="text-xs text-text-primary">
                {t.format('rooms.playerCards', { count: player.handCount })}
              </span>
            </li>
          );
        })}
      </ul>

      {isActive ? (
        <p className="text-center text-sm font-medium text-text-primary">
          {isMyTurn
            ? t.t('rooms.turnYours')
            : t.format('rooms.turnWaiting', {
                name: nameFor(snapshot.currentPlayerId ?? ''),
              })}
        </p>
      ) : null}

      {isMyTurn && target ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-text-primary">
            {t.format('rooms.drawFrom', { name: nameFor(target.id) })}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: target.handCount }).map((_, index) => {
              const token = mintPositionToken(snapshot.stateVersion, target.id, index);
              return (
                <button
                  key={token}
                  type="button"
                  disabled={busy}
                  onClick={() => void onDraw(token)}
                  className="rounded-lg transition hover:-translate-y-1 focus:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary disabled:pointer-events-none disabled:opacity-60"
                  aria-label={t.format('rooms.drawFrom', { name: nameFor(target.id) })}
                >
                  <PlayingCard faceDown size="sm" />
                </button>
              );
            })}
          </div>
          {busy ? <span className="text-xs text-text-primary">{t.t('rooms.drawing')}</span> : null}
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-primary">
          {t.t('rooms.yourHand')}
        </span>
        {hand.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {hand.map((card) => (
              <PlayingCard key={card.id} card={card} size="sm" />
            ))}
          </div>
        ) : (
          <span className="text-sm text-text-primary">{t.t('rooms.handEmpty')}</span>
        )}
      </div>

      {game.status === 'complete' && result ? (
        <div className="flex flex-col items-center gap-1 rounded-md bg-surface-primary px-4 py-3 text-center shadow-sm">
          <span className="text-lg font-bold text-action-primary">{t.t('rooms.gameOver')}</span>
          <span className="text-sm text-text-primary">
            {result.winners.includes(userId)
              ? t.t('rooms.youWon')
              : result.loser === userId
                ? t.t('rooms.youAreGadhaChor')
                : t.format('rooms.gadhaChorIs', { name: nameFor(result.loser) })}
          </span>
        </div>
      ) : null}

      {error ? <p className="text-center text-sm text-status-error">{error}</p> : null}
    </div>
  );
}
