'use client';

import {
  cardId,
  type Card,
  type GameResult,
  type PublicPlayerView,
  type PublicSnapshot,
} from '@lazy-patta/game-contracts';
import { mintPositionToken } from '@lazy-patta/game-engine';
import { playableCards, toTableauLanes, type LalSattiResult } from '@lazy-patta/lal-satti-engine';
import type { Locale } from '@lazy-patta/localization';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { HiddenCardSlot } from '../../lib/computer-game/types';
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
import { PlayerHandFan as LalSattiHandFan } from '../../src/features/lal-satti/immersive/PlayerHandFan';
import { PlayerPod as LalSattiPod } from '../../src/features/lal-satti/immersive/PlayerPod';
import { SuitRail } from '../../src/features/lal-satti/immersive/SuitRail';
import { positionSeats, type PositionedSeat } from '../../src/features/lal-satti/immersive/shared';
import type { LalSattiSeatView } from '../../src/features/lal-satti/types';
import { OpponentDrawFan } from '../game/immersive/OpponentDrawFan';
import { PlayerHandFan as GadhaHandFan } from '../game/immersive/PlayerHandFan';
import { PlayerPod as GadhaPod } from '../game/immersive/PlayerPod';

// The immersive felt/pod/hand primitives live in the solo game stylesheets; the
// online board reuses those exact classes so both surfaces share one look.
import '../../app/play/gadha-chor/computer/computer-game.css';
import '../../app/play/lal-satti/computer/lal-satti-game.css';

/**
 * Live game surface. Renders the authoritative public snapshot (seat counts,
 * whose turn) plus the viewer's own hand on the same immersive felt table used
 * by the solo games — reusing the seated player pods, the animated active-turn
 * ring, the card fan, and (per game) the suit rails or the opponent draw fan.
 * All truth comes from the server: this component only reads (snapshot + own
 * hand via RLS) and POSTs actions to the authority route. It never sees another
 * player's cards. Classic Gadha Chor deals clockwise, so the draw target is the
 * next active seat after the current player.
 */

const POLL_MS = 2000;
const CLOCKWISE_STEP = 1;
const INVALID_CLEAR_MS = 700;

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function newActionId(): string {
  const maybeUuid = globalThis.crypto?.randomUUID?.();
  return maybeUuid ?? `act-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function initialFor(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : '?';
}

/** Honour the OS reduced-motion setting so the felt animations can rest. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (): void => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
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

/** The continuous felt table: sky + wooden rim + peacock felt, pods on top. */
function FeltTable({
  reducedMotion,
  children,
}: {
  readonly reducedMotion: boolean;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div
      className="online-felt relative isolate overflow-hidden rounded-2xl p-2 text-text-onBrand shadow-md sm:p-3"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={{
        background: 'linear-gradient(135deg, var(--lp-scene-rim) 0%, var(--lp-scene-rimEdge) 100%)',
      }}
    >
      <div className="relative min-h-[24rem] rounded-xl">
        <div className="gc-felt">
          <div className="gc-felt-pattern" aria-hidden />
          <div className="gc-felt-border" aria-hidden />
        </div>
        <div className="relative z-10 grid grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-2 sm:p-3">
          {children}
        </div>
      </div>
    </div>
  );
}

export interface GameBoardProps {
  readonly roomId: string;
  readonly seats: readonly RoomSeat[];
  readonly userId: string;
  readonly locale: Locale;
}

export function GameBoard({ roomId, seats, userId, locale }: GameBoardProps): ReactElement {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const reducedMotion = usePrefersReducedMotion();
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

  // Presentation seats for the felt table: viewer anchors the bottom, the rest
  // wrap the rim. Turn/identity come straight from the authoritative snapshot.
  const seatViews = useMemo<readonly LalSattiSeatView[]>(() => {
    if (!snapshot) return [];
    const currentId = snapshot.currentPlayerId;
    return snapshot.players.map((player) => {
      const isSelf = player.id === userId;
      const name = nameFor(player.id);
      return {
        id: player.id,
        name,
        avatarInitial: initialFor(name),
        isSelf,
        isActive: Boolean(isActive) && currentId === player.id,
        isFinished: player.status === 'finished',
        cardCount: player.handCount,
      };
    });
  }, [snapshot, userId, nameFor, isActive]);
  const positioned = useMemo(() => positionSeats(seatViews), [seatViews]);

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
        seats={positioned}
        reducedMotion={reducedMotion}
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

  const topSeats = positioned.filter((seat) => seat.position === 'top');
  const leftSeats = positioned.filter((seat) => seat.position === 'left');
  const rightSeats = positioned.filter((seat) => seat.position === 'right');
  const selfSeat = positioned.find((seat) => seat.position === 'bottom');

  const drawSlots: readonly HiddenCardSlot[] =
    isMyTurn && target
      ? Array.from({ length: target.handCount }).map((_, index) => ({
          ownerId: target.id,
          ownerName: nameFor(target.id),
          positionToken: mintPositionToken(gadhaSnapshot.stateVersion, target.id, index),
          displayIndex: index + 1,
          isSelectable: !busy,
        }))
      : [];

  return (
    <div className="flex w-full flex-col gap-4">
      <FeltTable reducedMotion={reducedMotion}>
        <div className="flex items-start justify-center gap-4">
          {topSeats.map((seat) => (
            <GadhaPod key={seat.id} locale={locale} seat={seat} />
          ))}
        </div>

        <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <div className="flex flex-col justify-center gap-4">
            {leftSeats.map((seat) => (
              <GadhaPod key={seat.id} locale={locale} seat={seat} />
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-3 text-center">
            {isActive ? (
              <p
                className="text-balance text-base font-bold text-text-onBrand drop-shadow-sm"
                aria-live="polite"
              >
                {isMyTurn
                  ? t.t('rooms.turnYours')
                  : t.format('rooms.turnWaiting', {
                      name: nameFor(gadhaSnapshot.currentPlayerId ?? ''),
                    })}
              </p>
            ) : null}
            {isMyTurn && target ? (
              <>
                <span className="text-xs font-semibold uppercase tracking-widest text-action-secondary">
                  {t.format('rooms.drawFrom', { name: nameFor(target.id) })}
                </span>
                <OpponentDrawFan locale={locale} slots={drawSlots} onChooseCard={onDraw} />
                {busy ? (
                  <span className="text-xs text-text-onBrand/90">{t.t('rooms.drawing')}</span>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="flex flex-col justify-center gap-4">
            {rightSeats.map((seat) => (
              <GadhaPod key={seat.id} locale={locale} seat={seat} />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {selfSeat ? <GadhaPod locale={locale} seat={selfSeat} /> : null}
          <GadhaHandFan locale={locale} cards={hand} />
        </div>
      </FeltTable>

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
  readonly seats: readonly PositionedSeat[];
  readonly reducedMotion: boolean;
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
  seats,
  reducedMotion,
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
  const playableIds = useMemo(() => playable.map((card) => card.id), [playable]);
  const canPass = isMyTurn && playable.length === 0;

  const [focusedCard, setFocusedCard] = useState<Card | null>(null);
  const [invalidCardId, setInvalidCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!invalidCardId) return;
    const timer = window.setTimeout(() => setInvalidCardId(null), INVALID_CLEAR_MS);
    return () => window.clearTimeout(timer);
  }, [invalidCardId]);

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

  const onSelectCard = (card: Card): void => {
    if (!isMyTurn) return;
    if (playableIds.includes(card.id)) {
      setInvalidCardId(null);
      void submit({ type: 'PLAY_CARD', cardId: card.id });
      return;
    }
    setInvalidCardId(null);
    window.requestAnimationFrame(() => setInvalidCardId(card.id));
  };

  const topSeats = seats.filter((seat) => seat.position === 'top');
  const leftSeats = seats.filter((seat) => seat.position === 'left');
  const rightSeats = seats.filter((seat) => seat.position === 'right');
  const selfSeat = seats.find((seat) => seat.position === 'bottom');

  const result = game.result as LalSattiResult | null;
  const leftovers = result
    ? Object.entries(result.remainingCards).filter(([, count]) => Number(count) > 0)
    : [];

  return (
    <div className="flex w-full flex-col gap-4">
      <FeltTable reducedMotion={reducedMotion}>
        <div className="flex items-start justify-center gap-4">
          {topSeats.map((seat) => (
            <LalSattiPod key={seat.id} locale={locale} seat={seat} compact reaction={null} />
          ))}
        </div>

        <div className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <div className="flex flex-col justify-center gap-4">
            {leftSeats.map((seat) => (
              <LalSattiPod key={seat.id} locale={locale} seat={seat} compact reaction={null} />
            ))}
          </div>

          <div className="flex flex-col justify-center gap-2">
            {isActive ? (
              <p
                className="text-center text-base font-bold text-text-onBrand drop-shadow-sm"
                aria-live="polite"
              >
                {isMyTurn
                  ? t.t('rooms.lalSattiTurnYours')
                  : t.format('rooms.turnWaiting', {
                      name: nameFor(snapshot.currentPlayerId ?? ''),
                    })}
              </p>
            ) : null}
            <div className="flex flex-col gap-1.5" aria-label={t.t('rooms.lalSattiTableau')}>
              {lanes.map((lane) => (
                <SuitRail
                  key={lane.suit}
                  locale={locale}
                  lane={lane}
                  highlighted={focusedCard?.suit === lane.suit}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4">
            {rightSeats.map((seat) => (
              <LalSattiPod key={seat.id} locale={locale} seat={seat} compact reaction={null} />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          {selfSeat ? <LalSattiPod locale={locale} seat={selfSeat} reaction={null} /> : null}
          {canPass ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit({ type: 'PASS' })}
              className="rounded-md bg-action-secondary px-4 py-2 text-sm font-semibold text-text-onBrand transition hover:bg-action-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:pointer-events-none disabled:opacity-60"
            >
              {t.t('rooms.lalSattiPass')}
            </button>
          ) : null}
          <LalSattiHandFan
            locale={locale}
            cards={hand}
            playableCardIds={playableIds}
            isHumanTurn={isMyTurn}
            focusedCardId={focusedCard?.id ?? null}
            invalidCardId={invalidCardId}
            onSelect={onSelectCard}
            onFocusCard={setFocusedCard}
          />
        </div>
      </FeltTable>

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
                    points: Number(result.remainingPoints?.[playerId] ?? 0),
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
