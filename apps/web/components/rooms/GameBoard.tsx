'use client';

import {
  cardId,
  type Card,
  type GameResult,
  type PublicPlayerView,
  type PublicSnapshot,
  type Rank,
  type Suit,
} from '@lazy-patta/game-contracts';
import { mintPositionToken } from '@lazy-patta/game-engine';
import { playableCards, toTableauLanes, type LalSattiResult } from '@lazy-patta/lal-satti-engine';
import type { Locale, MessageKey } from '@lazy-patta/localization';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import {
  drawCard,
  fetchLatestGame,
  fetchMyHand,
  submitLalSattiAction,
  type GameRow,
} from '../../lib/online-game/games-client';
import type { LalSattiPublicSnapshot } from '../../lib/online-game/lal-satti-authority';
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
const SUIT_GLYPH: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function newActionId(): string {
  const maybeUuid = globalThis.crypto?.randomUUID?.();
  return maybeUuid ?? `act-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function rankKey(rank: Rank): MessageKey {
  return `rank.${rank}` as MessageKey;
}

function suitKey(suit: Suit): MessageKey {
  return `suit.${suit}` as MessageKey;
}

function cardLabel(card: Card, locale: Locale): string {
  const translator = createTranslator(locale);
  return translator.format('card.accessibleFace', {
    rank: translator.t(rankKey(card.rank)),
    suit: translator.t(suitKey(card.suit)),
  });
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

  if (game.game_key === 'lal_satti') {
    return (
      <LalSattiOnlineBoard
        game={game}
        snapshot={snapshot as LalSattiPublicSnapshot}
        hand={hand}
        userId={userId}
        locale={locale}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
        error={error}
        refresh={refresh}
        nameFor={nameFor}
      />
    );
  }

  const gadhaSnapshot = snapshot as PublicSnapshot;
  const result = game.result as GameResult | null;
  const target = drawTarget(gadhaSnapshot.players, gadhaSnapshot.currentPlayerId);
  const isMyTurn = Boolean(isActive && gadhaSnapshot.currentPlayerId === userId);

  return (
    <div className="flex w-full flex-col gap-5">
      <ul className="flex flex-col gap-2">
        {gadhaSnapshot.players.map((player) => {
          const isTurn = isActive && gadhaSnapshot.currentPlayerId === player.id;
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
                name: nameFor(gadhaSnapshot.currentPlayerId ?? ''),
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
              const token = mintPositionToken(gadhaSnapshot.stateVersion, target.id, index);
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

interface LalSattiOnlineBoardProps {
  readonly game: GameRow;
  readonly snapshot: LalSattiPublicSnapshot;
  readonly hand: readonly Card[];
  readonly userId: string;
  readonly locale: Locale;
  readonly busy: boolean;
  readonly setBusy: (value: boolean) => void;
  readonly setError: (value: string | undefined) => void;
  readonly error: string | undefined;
  readonly refresh: () => Promise<void>;
  readonly nameFor: (playerId: string) => string;
}

function LalSattiOnlineBoard({
  game,
  snapshot,
  hand,
  userId,
  locale,
  busy,
  setBusy,
  setError,
  error,
  refresh,
  nameFor,
}: LalSattiOnlineBoardProps): ReactElement {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const isActive = game.status === 'active';
  const isMyTurn = Boolean(isActive && snapshot.currentPlayerId === userId);
  const lanes = useMemo(() => toTableauLanes(snapshot.tableau), [snapshot.tableau]);
  const playable = useMemo(() => {
    if (!isMyTurn) return [];
    const openingRequired = snapshot.stateVersion === 0 && snapshot.tableau.hearts.length === 0;
    if (openingRequired) return hand.filter((card) => card.id === cardId('hearts', '7'));
    return playableCards(snapshot.tableau, hand);
  }, [hand, isMyTurn, snapshot.stateVersion, snapshot.tableau]);
  const playableIds = useMemo(() => new Set(playable.map((card) => card.id)), [playable]);
  const canPass = isMyTurn && playable.length === 0;

  const submit = useCallback(
    async (action: { type: 'PLAY_CARD'; cardId: string } | { type: 'PASS' }): Promise<void> => {
      if (busy) return;
      setBusy(true);
      setError(undefined);
      try {
        await submitLalSattiAction(getSupabaseBrowserClient(), game.id, {
          clientActionId: newActionId(),
          action,
          expectedVersion: game.state_version,
        });
      } catch (caught) {
        setError(messageFor(caught, t.t('rooms.errorGeneric')));
      } finally {
        await refresh();
        setBusy(false);
      }
    },
    [busy, game.id, game.state_version, refresh, setBusy, setError, t],
  );

  const result = game.result as LalSattiResult | null;
  const leftovers = result
    ? Object.entries(result.remainingCards).filter(([, count]) => Number(count) > 0)
    : [];

  return (
    <div className="flex w-full flex-col gap-5">
      <ul className="grid gap-2 sm:grid-cols-2">
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
                {player.status === 'finished' ? ` · ${t.t('rooms.lalSattiFinished')}` : ''}
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
            ? t.t('rooms.lalSattiTurnYours')
            : t.format('rooms.turnWaiting', {
                name: nameFor(snapshot.currentPlayerId ?? ''),
              })}
        </p>
      ) : null}

      <section
        className="rounded-md bg-game-table p-3 text-text-onBrand shadow-sm"
        aria-label={t.t('rooms.lalSattiTableau')}
      >
        <div className="grid gap-2">
          {lanes.map((lane) => (
            <div key={lane.suit} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2">
              <div className="text-2xl" aria-label={t.t(suitKey(lane.suit))}>
                {SUIT_GLYPH[lane.suit]}
              </div>
              <div className="flex min-h-20 items-center gap-2 overflow-x-auto rounded-md bg-surface-primary p-2 text-text-primary">
                {lane.cards.length > 0 ? (
                  lane.cards.map((card) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      size="sm"
                      label={cardLabel(card, locale)}
                    />
                  ))
                ) : (
                  <span className="text-sm text-text-primary">
                    {t.t('rooms.lalSattiLaneEmpty')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col items-center gap-3 rounded-md bg-surface-primary px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-primary">
            {t.t('rooms.yourHand')}
          </span>
          {canPass ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit({ type: 'PASS' })}
              className="rounded-md bg-action-secondary px-3 py-2 text-sm font-semibold text-text-onBrand transition hover:bg-action-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-action-primary disabled:pointer-events-none disabled:opacity-60"
            >
              {t.t('rooms.lalSattiPass')}
            </button>
          ) : null}
        </div>
        {isMyTurn && playable.length > 0 ? (
          <span className="text-xs text-brand-accent">{t.t('rooms.lalSattiPlayable')}</span>
        ) : null}
        {hand.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-2">
            {hand.map((card) => {
              const playableNow = playableIds.has(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  disabled={!playableNow || busy}
                  onClick={() => void submit({ type: 'PLAY_CARD', cardId: card.id })}
                  className={[
                    'rounded-md p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:pointer-events-none',
                    playableNow ? '-translate-y-1 bg-action-secondary shadow-md' : 'opacity-70',
                  ].join(' ')}
                  aria-label={t.format('lalSatti.playCardLabel', {
                    card: cardLabel(card, locale),
                  })}
                >
                  <PlayingCard card={card} size="sm" label={cardLabel(card, locale)} />
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-sm text-text-primary">{t.t('rooms.handEmpty')}</span>
        )}
      </div>

      {game.status === 'complete' && result ? (
        <div className="flex flex-col items-center gap-2 rounded-md bg-surface-primary px-4 py-3 text-center shadow-sm">
          <span className="text-lg font-bold text-action-primary">{t.t('rooms.gameOver')}</span>
          <span className="text-sm text-text-primary">
            {t.format('rooms.lalSattiWinner', {
              name: result.winnerIds.map(nameFor).join(', '),
            })}
          </span>
          {leftovers.length > 0 ? (
            <ul className="text-sm text-text-primary">
              {leftovers.map(([playerId, count]) => (
                <li key={playerId}>
                  {t.format('rooms.lalSattiLeftover', {
                    name: nameFor(playerId),
                    count: Number(count),
                  })}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-center text-sm text-status-error">{error}</p> : null}
    </div>
  );
}
