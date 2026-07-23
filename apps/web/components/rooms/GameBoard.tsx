'use client';

import {
  cardId,
  type Card,
  type GameResult,
  type PublicPlayerView,
  type PublicSnapshot,
  type Suit,
} from '@lazy-patta/game-contracts';
import { mintPositionToken } from '@lazy-patta/game-engine';
import type { JhabbuResult } from '@lazy-patta/jhabbu-engine';
import {
  KACHUFUL_FAMILY_DESCENDING,
  kachufulRoundScore,
  trickWinner,
  type KachufulResult,
} from '@lazy-patta/kachuful-engine';
import { playableCards, toTableauLanes, type LalSattiResult } from '@lazy-patta/lal-satti-engine';
import type { Locale, MessageKey } from '@lazy-patta/localization';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import type { HiddenCardSlot } from '../../lib/computer-game/types';
import type { GameSlug } from '../../lib/game-discovery';
import { trackGrowthEvent } from '../../lib/growth/analytics';
import { gameLifecycleEvent, startedAtMsOf } from '../../lib/growth/room-telemetry';
import { createTranslator } from '../../lib/i18n';
import {
  drawCard,
  fetchLatestGame,
  fetchMyHand,
  submitJhabbuAction,
  submitKachufulAction,
  submitLalSattiAction,
  type GameRow,
} from '../../lib/online-game/games-client';
import type {
  JhabbuClientAction,
  JhabbuPublicSnapshot,
} from '../../lib/online-game/jhabbu-authority';
import type {
  KachufulClientAction,
  KachufulPublicSnapshot,
} from '../../lib/online-game/kachuful-authority';
import type { LalSattiPublicSnapshot } from '../../lib/online-game/lal-satti-authority';
import { subscribeToGame } from '../../lib/rooms/realtime';
import type { RoomSeat } from '../../lib/rooms/rooms-client';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';
import { PlayerHandFan as LalSattiHandFan } from '../../src/features/lal-satti/immersive/PlayerHandFan';
import { PlayerPod as LalSattiPod } from '../../src/features/lal-satti/immersive/PlayerPod';
import { SuitRail } from '../../src/features/lal-satti/immersive/SuitRail';
import { positionSeats, type PositionedSeat } from '../../src/features/lal-satti/immersive/shared';
import type { LalSattiSeatView } from '../../src/features/lal-satti/types';
import { PlayingCard } from '../PlayingCard';
import { CourtyardBackdropPlaceholder } from '../game/art';
import { OpponentDrawFan } from '../game/immersive/OpponentDrawFan';
import { PlayerHandFan as GadhaHandFan } from '../game/immersive/PlayerHandFan';
import { PlayerPod as GadhaPod } from '../game/immersive/PlayerPod';

import { RoomEndActions } from './RoomEndActions';

// The immersive felt/pod/hand primitives live in the solo game stylesheets; the
// online board reuses those exact classes so both surfaces share one look.
import '../../app/play/gadha-chor/computer/computer-game.css';
import '../../app/play/lal-satti/computer/lal-satti-game.css';
import '../../app/play/jhabbu/computer/jhabbu-game.css';

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

const POLL_MS = 15000;
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

/** Map the persisted room game key to the discovery slug used by share text. */
function slugForGameKey(gameKey: string): GameSlug {
  if (gameKey === 'lal_satti') return 'lal-satti';
  if (gameKey === 'jhabbu') return 'jhabbu';
  if (gameKey === 'kachuful') return 'kachuful';
  return 'gadha-chor';
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

/**
 * The full-screen immersive table, sharing the exact solo scene structure:
 * an evening-sky shell, the courtyard backdrop, a wooden-rim felt mat, and the
 * three-row region grid (opponents along the rim, the table in the middle, the
 * viewer + hand at the bottom). `variant` picks the game's prefixed class set
 * (`gc-*` for Gadha Chor, `ls-*` for Lal Satti) so the felt CSS matches solo
 * one-for-one. Rendered as a fixed layer so it escapes the lobby's narrow
 * column and takes over the viewport like the solo route does. The solo shells
 * use a `<main>`; here it is a `<div>` since this mounts inside the page's own
 * `<main>`.
 */
function OnlineShell({
  variant,
  reducedMotion,
  label,
  gameLabel,
  code,
  onLeave,
  leaveLabel,
  error,
  overlay,
  children,
}: {
  readonly variant: 'gc' | 'ls';
  readonly reducedMotion: boolean;
  readonly label: string;
  readonly gameLabel: string;
  readonly code?: string;
  readonly onLeave?: () => void;
  readonly leaveLabel: string;
  readonly error?: string;
  readonly overlay?: ReactNode;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <div className="fixed inset-0 z-40">
      <div className={`${variant}-shell`} data-reduced-motion={reducedMotion ? 'true' : 'false'}>
        <CourtyardBackdropPlaceholder />

        <div className="relative z-10 flex items-center justify-between gap-3 px-3 pt-2">
          <div className="flex flex-col leading-tight">
            <span className="text-[0.6rem] font-semibold uppercase tracking-widest text-text-onBrand/70">
              {gameLabel}
            </span>
            {code ? (
              <span className="text-base font-bold tracking-[0.25em] text-text-onBrand">
                {code}
              </span>
            ) : null}
          </div>
          {onLeave ? (
            <button
              type="button"
              onClick={onLeave}
              className="rounded-md border border-text-onBrand/30 px-3 py-1.5 text-xs font-semibold text-text-onBrand/90 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              {leaveLabel}
            </button>
          ) : null}
        </div>

        <section className={`${variant}-scene`} aria-label={label}>
          <div className={`${variant}-felt`}>
            <div className={`${variant}-felt-pattern`} aria-hidden />
            <div className={`${variant}-felt-border`} aria-hidden />
          </div>

          <div className={`${variant}-regions`}>{children}</div>

          {overlay}

          {error ? (
            <div className="absolute inset-x-0 bottom-3 z-40 flex justify-center px-4">
              <p className="rounded-md bg-status-error/95 px-3 py-1.5 text-center text-sm font-semibold text-text-onBrand shadow-md">
                {error}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export interface GameBoardProps {
  readonly roomId: string;
  readonly seats: readonly RoomSeat[];
  readonly userId: string;
  readonly locale: Locale;
  readonly code?: string;
  readonly onLeave?: () => void;
  /** Host-only: return the room to the lobby to deal a fresh hand. */
  readonly onRematch?: () => void;
}

export function GameBoard({
  roomId,
  seats,
  userId,
  locale,
  code,
  onLeave,
  onRematch,
}: GameBoardProps): ReactElement {
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

  // Live game updates: refetch the snapshot + own hand whenever the game row or
  // the viewer's own private hand changes (RLS keeps the hand stream scoped to
  // this user). The interval above stays on as a slower backstop.
  useEffect(() => {
    return subscribeToGame(getSupabaseBrowserClient(), roomId, userId, () => void refresh());
  }, [roomId, userId, refresh]);

  // Release telemetry: emit "family match started" once a live game is observed
  // active, and "family match completed" (with the round duration) once it
  // finishes — the roadmap's core signal that a real multi-device hand ran end to
  // end. Fire-once per game id per phase so a poll/Realtime refetch cannot
  // double-count; every seated client emits, and the analytics layer strips any
  // identifying fields before dispatch.
  const firedLifecycle = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!game || game.status === 'abandoned') return;
    const key = `${game.id}:${game.status}`;
    if (firedLifecycle.current.has(key)) return;
    const playerCount = seats.filter((seat) => seat.occupant === 'human').length;
    const event = gameLifecycleEvent({
      status: game.status,
      gameSlug: slugForGameKey(game.game_key),
      playerCount,
      startedAtMs: startedAtMsOf(game.created_at),
      nowMs: Date.now(),
    });
    if (event) {
      firedLifecycle.current.add(key);
      trackGrowthEvent(event);
    }
  }, [game, seats]);

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
        // Kachuful's public player view has no `status`; only the finish-tracking
        // games (Gadha Chor, Jhabbu) mark a seat finished.
        isFinished: 'status' in player && player.status === 'finished',
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

  const gameLabel =
    game.game_key === 'lal_satti'
      ? t.t('rooms.gameLalSatti')
      : game.game_key === 'jhabbu'
        ? t.t('rooms.gameJhabbu')
        : game.game_key === 'kachuful'
          ? t.t('rooms.gameKachuful')
          : t.t('rooms.gameGadhaChor');
  const leaveLabel = t.t('rooms.leave');
  const slug = slugForGameKey(game.game_key);

  if (game.game_key === 'jhabbu') {
    return (
      <JhabbuOnlineBoard
        game={game}
        snapshot={snapshot as JhabbuPublicSnapshot}
        hand={hand}
        userId={userId}
        locale={locale}
        reducedMotion={reducedMotion}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
        error={error}
        refresh={refresh}
        nameFor={nameFor}
        gameLabel={gameLabel}
        leaveLabel={leaveLabel}
        code={code}
        onLeave={onLeave}
        onRematch={onRematch}
        slug={slug}
      />
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
        gameLabel={gameLabel}
        leaveLabel={leaveLabel}
        code={code}
        onLeave={onLeave}
        onRematch={onRematch}
        slug={slug}
      />
    );
  }

  if (game.game_key === 'kachuful') {
    return (
      <KachufulOnlineBoard
        game={game}
        snapshot={snapshot as KachufulPublicSnapshot}
        hand={hand}
        seats={positioned}
        userId={userId}
        locale={locale}
        reducedMotion={reducedMotion}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
        error={error}
        refresh={refresh}
        nameFor={nameFor}
        gameLabel={gameLabel}
        leaveLabel={leaveLabel}
        code={code}
        onLeave={onLeave}
        onRematch={onRematch}
        slug={slug}
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

  const gadhaOverlay =
    game.status === 'complete' && result ? (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-lg bg-surface-primary px-5 py-4 text-center shadow-md">
          <span className="text-lg font-bold text-action-primary">{t.t('rooms.gameOver')}</span>
          <span className="text-sm text-text-primary">
            {result.winners.includes(userId)
              ? t.t('rooms.youWon')
              : result.loser === userId
                ? t.t('rooms.youAreGadhaChor')
                : t.format('rooms.gadhaChorIs', { name: nameFor(result.loser) })}
          </span>
          <RoomEndActions
            locale={locale}
            gameSlug={slug}
            gameName={gameLabel}
            {...(result.winners[0] ? { winnerDisplayName: nameFor(result.winners[0]) } : {})}
            playerCount={gadhaSnapshot.players.length}
            onRematch={onRematch}
            busy={busy}
          />
        </div>
      </div>
    ) : null;

  return (
    <OnlineShell
      variant="gc"
      reducedMotion={reducedMotion}
      label={t.t('rooms.gameGadhaChor')}
      gameLabel={gameLabel}
      code={code}
      onLeave={onLeave}
      leaveLabel={leaveLabel}
      error={error}
      overlay={gadhaOverlay}
    >
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
    </OnlineShell>
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
  readonly gameLabel: string;
  readonly leaveLabel: string;
  readonly code?: string;
  readonly onLeave?: () => void;
  readonly onRematch?: () => void;
  readonly slug: GameSlug;
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
  gameLabel,
  leaveLabel,
  code,
  onLeave,
  onRematch,
  slug,
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

  const lalSattiOverlay =
    game.status === 'complete' && result ? (
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
        <div className="flex max-w-sm flex-col items-center gap-2 rounded-lg bg-surface-primary px-5 py-4 text-center shadow-md">
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
          <RoomEndActions
            locale={locale}
            gameSlug={slug}
            gameName={gameLabel}
            {...(result.winnerIds[0] ? { winnerDisplayName: nameFor(result.winnerIds[0]) } : {})}
            playerCount={snapshot.players.length}
            onRematch={onRematch}
            busy={busy}
          />
        </div>
      </div>
    ) : null;

  return (
    <OnlineShell
      variant="ls"
      reducedMotion={reducedMotion}
      label={t.t('rooms.gameLalSatti')}
      gameLabel={gameLabel}
      code={code}
      onLeave={onLeave}
      leaveLabel={leaveLabel}
      error={error}
      overlay={lalSattiOverlay}
    >
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
    </OnlineShell>
  );
}

const JHABBU_SUIT_GLYPH: Record<string, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

const SUIT_GLYPH: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};

function jhabbuCardLabel(card: Card): string {
  return `${card.rank} of ${card.suit}`;
}

interface JhabbuOnlineBoardProps {
  readonly game: GameRow;
  readonly snapshot: JhabbuPublicSnapshot;
  readonly hand: readonly Card[];
  readonly userId: string;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly busy: boolean;
  readonly setBusy: (value: boolean) => void;
  readonly setError: (value: string | undefined) => void;
  readonly error: string | undefined;
  readonly refresh: () => Promise<void>;
  readonly nameFor: (playerId: string) => string;
  readonly gameLabel: string;
  readonly leaveLabel: string;
  readonly code?: string;
  readonly onLeave?: () => void;
  readonly onRematch?: () => void;
  readonly slug: GameSlug;
}

/**
 * Live Jhabbu surface. Mirrors the solo Jhabbu table (`jh-*` classes) rather
 * than the felt/pod immersive scene the other two online games use, so the
 * online room matches Jhabbu's own practice look. All truth is server-side:
 * this reads the authoritative public snapshot + the viewer's own hand and
 * POSTs plays/draws to the authority route. Playable-card highlighting is a
 * client convenience recomputed from the public snapshot; the server re-derives
 * and re-validates every move, so a stale or forged highlight cannot cheat.
 */
function JhabbuOnlineBoard({
  game,
  snapshot,
  hand,
  userId,
  locale,
  reducedMotion,
  busy,
  setBusy,
  setError,
  error,
  refresh,
  nameFor,
  gameLabel,
  leaveLabel,
  code,
  onLeave,
  onRematch,
  slug,
}: JhabbuOnlineBoardProps): ReactElement {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const isActive = game.status === 'active';
  const isMyTurn = Boolean(isActive && snapshot.currentPlayerId === userId);

  const mustDraw =
    isMyTurn && snapshot.powerPlayerId === userId && hand.length === 0 && snapshot.wasteCount > 0;

  const playableIds = useMemo<readonly string[]>(() => {
    if (!isMyTurn || mustDraw) return [];
    const openingRequired = snapshot.phase === 'first_trick' && snapshot.currentTrick.length === 0;
    if (openingRequired) {
      const opener = cardId('spades', 'ace');
      return hand.filter((card) => card.id === opener).map((card) => card.id);
    }
    const led = snapshot.ledSuit;
    if (!led) return hand.map((card) => card.id);
    const hasLed = hand.some((card) => card.suit === led);
    const legal = hasLed ? hand.filter((card) => card.suit === led) : hand;
    return legal.map((card) => card.id);
  }, [hand, isMyTurn, mustDraw, snapshot.phase, snapshot.currentTrick.length, snapshot.ledSuit]);
  const playable = useMemo(() => new Set(playableIds), [playableIds]);

  const submit = useCallback(
    async (action: JhabbuClientAction): Promise<void> => {
      if (busy) return;
      setBusy(true);
      setError(undefined);
      try {
        await submitJhabbuAction(getSupabaseBrowserClient(), game.id, {
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

  const result = game.result as JhabbuResult | null;

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-background-canvas"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
    >
      <main className="jh-shell min-h-screen text-text-primary">
        <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-3 py-4 md:px-6">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-primary/95 p-3 shadow-md">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-accent">
                {gameLabel}
              </p>
              <h1 className="text-xl font-black text-action-primary md:text-2xl" aria-live="polite">
                {isActive
                  ? isMyTurn
                    ? t.t('rooms.jhabbuTurnYours')
                    : t.format('rooms.turnWaiting', {
                        name: nameFor(snapshot.currentPlayerId ?? ''),
                      })
                  : t.t('rooms.waitingToStart')}
              </h1>
              {code ? (
                <p className="mt-1 text-sm font-bold tracking-[0.25em] text-text-primary">{code}</p>
              ) : null}
            </div>
            {onLeave ? (
              <button
                type="button"
                onClick={onLeave}
                className="rounded-md border border-action-primary px-3 py-1.5 text-sm font-bold text-action-primary transition hover:bg-background-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                {leaveLabel}
              </button>
            ) : null}
          </header>

          <div className="grid flex-1 gap-4 lg:grid-cols-[16rem_1fr]">
            <aside className="rounded-lg bg-surface-primary/95 p-3 shadow-md">
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-action-primary">
                {t.t('jhabbu.players')}
              </h2>
              <div className="mt-3 space-y-2">
                {snapshot.players.map((player) => {
                  const name = nameFor(player.id);
                  const active = isActive && snapshot.currentPlayerId === player.id;
                  return (
                    <div
                      key={player.id}
                      className={[
                        'rounded-md border p-3',
                        active
                          ? 'border-brand-accent bg-brand-accent/10'
                          : 'border-action-primary/15 bg-background-canvas',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-action-primary font-black text-text-onBrand">
                            {initialFor(name)}
                          </span>
                          <div>
                            <p className="font-bold text-action-primary">{name}</p>
                            <p className="text-xs text-text-primary">
                              {t.format('game.cardsRemainingCount', { count: player.handCount })}
                            </p>
                          </div>
                        </div>
                        {player.isPower ? (
                          <span className="rounded-full bg-brand-accent px-2 py-1 text-xs font-black text-text-onBrand">
                            {t.t('jhabbu.powerBadge')}
                          </span>
                        ) : null}
                      </div>
                      {player.status === 'got_away' ? (
                        <p className="mt-2 text-xs font-bold text-brand-accent">
                          {t.t('jhabbu.gotAway')}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </aside>

            <section className="jh-table rounded-lg bg-game-table p-3 text-text-onBrand shadow-lg md:p-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md bg-black/15 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em]">
                    {t.t('jhabbu.powerPlayer')}
                  </p>
                  <p className="mt-1 text-lg font-black">{nameFor(snapshot.powerPlayerId)}</p>
                </div>
                <div className="rounded-md bg-black/15 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em]">
                    {t.t('jhabbu.ledSuit')}
                  </p>
                  <p className="mt-1 text-lg font-black">
                    {snapshot.ledSuit
                      ? (JHABBU_SUIT_GLYPH[snapshot.ledSuit] ?? snapshot.ledSuit)
                      : t.t('jhabbu.noLedSuit')}
                  </p>
                </div>
                <div className="rounded-md bg-black/15 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em]">
                    {t.t('jhabbu.wastePile')}
                  </p>
                  <p className="mt-1 text-lg font-black">{snapshot.wasteCount}</p>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-white/20 bg-white/10 p-4">
                <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                  {t.t('jhabbu.currentTrick')}
                </h2>
                <div className="mt-4 flex min-h-32 flex-wrap items-center justify-center gap-3">
                  {snapshot.currentTrick.length > 0 ? (
                    snapshot.currentTrick.map((entry) => (
                      <div
                        key={`${entry.playerId}-${entry.card.id}-${entry.sequence}`}
                        className="text-center"
                      >
                        <PlayingCard
                          card={entry.card}
                          size="md"
                          label={jhabbuCardLabel(entry.card)}
                        />
                        <p className="mt-2 text-xs font-bold">
                          {entry.isThulla ? t.t('jhabbu.thullaCard') : nameFor(entry.playerId)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-semibold opacity-90">{t.t('jhabbu.emptyTrick')}</p>
                  )}
                </div>
              </div>

              {mustDraw ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit({ type: 'DRAW_FROM_WASTE' })}
                  className="mt-4 min-h-12 w-full rounded-md bg-brand-accent px-4 py-2 text-sm font-black text-text-onBrand transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:pointer-events-none disabled:opacity-60"
                >
                  {t.t('jhabbu.drawFromWaste')}
                </button>
              ) : null}
            </section>
          </div>

          <section className="rounded-lg bg-surface-primary p-3 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-action-primary">
                {t.t('jhabbu.yourCards')}
              </h2>
              <p className="text-sm font-bold text-text-primary">
                {playableIds.length > 0
                  ? t.format('jhabbu.playableCount', { count: playableIds.length })
                  : t.t('jhabbu.noPlayableCards')}
              </p>
            </div>
            <div className="jh-hand mt-3">
              {hand.map((card) => {
                const isPlayable = isMyTurn && playable.has(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={[
                      'jh-card-button rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                      isPlayable ? 'jh-card-playable' : 'jh-card-muted',
                    ].join(' ')}
                    onClick={() => void submit({ type: 'PLAY_CARD', cardId: card.id })}
                    disabled={!isPlayable || busy}
                    aria-label={jhabbuCardLabel(card)}
                  >
                    <PlayingCard card={card} size="md" label={jhabbuCardLabel(card)} />
                  </button>
                );
              })}
            </div>
          </section>

          {error ? (
            <p className="rounded-md bg-status-error/95 px-3 py-1.5 text-center text-sm font-semibold text-text-onBrand shadow-md">
              {error}
            </p>
          ) : null}
        </section>
      </main>

      {game.status === 'complete' && result ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-w-sm flex-col items-center gap-2 rounded-lg bg-surface-primary px-5 py-4 text-center shadow-md">
            <span className="text-lg font-bold text-action-primary">{t.t('rooms.gameOver')}</span>
            <span className="text-sm text-text-primary">
              {t.format('rooms.jhabbuLoser', { name: nameFor(result.loserId) })}
            </span>
            {result.finishOrder.length > 0 ? (
              <div className="mt-1 w-full">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-action-primary">
                  {t.t('jhabbu.finishOrder')}
                </p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-left text-sm text-text-primary">
                  {result.finishOrder.map((playerId) => (
                    <li key={playerId}>{nameFor(playerId)}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            <RoomEndActions
              locale={locale}
              gameSlug={slug}
              gameName={gameLabel}
              {...(result.finishOrder[0]
                ? { winnerDisplayName: nameFor(result.finishOrder[0]) }
                : {})}
              playerCount={snapshot.players.length}
              onRematch={onRematch}
              busy={busy}
            />
            {onLeave ? (
              <button
                type="button"
                onClick={onLeave}
                className="mt-2 rounded-md border border-action-primary px-4 py-2 text-sm font-bold text-action-primary transition hover:bg-background-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                {leaveLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface KachufulOnlineBoardProps {
  readonly game: GameRow;
  readonly snapshot: KachufulPublicSnapshot;
  readonly hand: readonly Card[];
  readonly seats: readonly PositionedSeat[];
  readonly userId: string;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly busy: boolean;
  readonly setBusy: (value: boolean) => void;
  readonly setError: (value: string | undefined) => void;
  readonly error: string | undefined;
  readonly refresh: () => Promise<void>;
  readonly nameFor: (playerId: string) => string;
  readonly gameLabel: string;
  readonly leaveLabel: string;
  readonly code?: string;
  readonly onLeave?: () => void;
  readonly onRematch?: () => void;
  readonly slug: GameSlug;
}

/**
 * Live Kachuful (Judgement) surface. Mirrors the solo Kachuful table: a running
 * scoreboard (bid vs tricks vs total), the trump/round banner, the current
 * trick, a bid keypad during the bidding phase, and the viewer's hand with
 * legal-card highlighting. All truth is server-side — this reads the
 * authoritative public snapshot plus the viewer's own hand (via RLS) and POSTs
 * bids/plays/next-round to the authority route, which re-derives and
 * re-validates every move. Legal bids and playable cards are recomputed here as
 * a UI convenience only; a stale or forged highlight cannot cheat the server.
 * The `round_scored` pause shows a "next round" button any player can press.
 */
function KachufulOnlineBoard({
  game,
  snapshot,
  hand,
  seats,
  userId,
  locale,
  reducedMotion,
  busy,
  setBusy,
  setError,
  error,
  refresh,
  nameFor,
  gameLabel,
  leaveLabel,
  code,
  onLeave,
  onRematch,
  slug,
}: KachufulOnlineBoardProps): ReactElement {
  const t = useMemo(() => createTranslator(locale), [locale]);
  const isActive = game.status === 'active';
  const isMyTurn = Boolean(isActive && snapshot.currentPlayerId === userId);

  const cardLabel = useCallback(
    (card: Card): string =>
      t.format('card.accessibleFace', {
        rank: t.t(`rank.${card.rank}` as MessageKey),
        suit: t.t(`suit.${card.suit}` as MessageKey),
      }),
    [t],
  );

  const trumpText =
    snapshot.trump === 'no-trump'
      ? t.t('kachuful.noTrump')
      : (SUIT_GLYPH[snapshot.trump] ?? snapshot.trump);

  // Legal bids mirror the engine's hook rule: 0..handSize, minus the value that
  // would make the dealer's table total equal the trick count. The server is the
  // real authority; this only greys out the forbidden key.
  const { legalBids, forbiddenBid } = useMemo<{
    legalBids: readonly number[];
    forbiddenBid: number | null;
  }>(() => {
    const all = Array.from({ length: snapshot.handSize + 1 }, (_, bid) => bid);
    if (snapshot.phase !== 'bidding' || snapshot.currentPlayerId !== userId) {
      return { legalBids: all, forbiddenBid: null };
    }
    const yetToBid = snapshot.players.filter((player) => player.bid === null);
    const isFinalBidder = yetToBid.length === 1 && yetToBid[0]!.id === userId;
    if (!isFinalBidder) return { legalBids: all, forbiddenBid: null };
    const others = snapshot.players.reduce(
      (total, player) => (player.id === userId ? total : total + (player.bid ?? 0)),
      0,
    );
    const forbidden = snapshot.handSize - others;
    return { legalBids: all.filter((bid) => bid !== forbidden), forbiddenBid: forbidden };
  }, [snapshot.handSize, snapshot.phase, snapshot.currentPlayerId, snapshot.players, userId]);

  const playableIds = useMemo<readonly string[]>(() => {
    if (!isMyTurn || snapshot.phase !== 'playing') return [];
    const led = snapshot.ledSuit;
    if (!led) return hand.map((card) => card.id);
    const hasLed = hand.some((card) => card.suit === led);
    const legal = hasLed ? hand.filter((card) => card.suit === led) : hand;
    return legal.map((card) => card.id);
  }, [hand, isMyTurn, snapshot.phase, snapshot.ledSuit]);
  const playable = useMemo(() => new Set(playableIds), [playableIds]);

  const playerById = useMemo(
    () => new Map(snapshot.players.map((player) => [player.id, player] as const)),
    [snapshot.players],
  );

  // The card currently winning the in-progress trick, decided with the same rule
  // the engine uses to award it. Only meaningful once a card has led.
  const winningId = useMemo<string | null>(() => {
    if (snapshot.currentTrick.length === 0 || snapshot.ledSuit === null) return null;
    return trickWinner(snapshot.currentTrick, snapshot.ledSuit, snapshot.trump).playerId;
  }, [snapshot.currentTrick, snapshot.ledSuit, snapshot.trump]);

  // When it's my turn and I hold the led suit, I'm forced to follow it.
  const mustFollowSuit =
    isMyTurn &&
    snapshot.phase === 'playing' &&
    snapshot.ledSuit !== null &&
    hand.some((card) => card.suit === snapshot.ledSuit);

  // Scores only lock in when the whole round finishes, so mid-round the running
  // total sits still. To make that legible we show a live "if the round ended
  // now" projection using the exact engine rule, and only once cards are in play
  // (during bidding the numbers would be noise). `null` means "no bid yet".
  const showRoundProjection = snapshot.phase !== 'bidding';
  const projectedRoundScore = useCallback(
    (bid: number | null, tricksWon: number): number | null =>
      bid === null ? null : kachufulRoundScore(KACHUFUL_FAMILY_DESCENDING, bid, tricksWon),
    [],
  );

  // Presentation seats around the felt: self anchors the bottom, opponents wrap
  // the rim (parent already positioned them). Counts/turn come from the snapshot.
  const selfSeat = seats.find((seat) => seat.position === 'bottom');
  const topSeats = seats.filter((seat) => seat.position === 'top');
  const leftSeats = seats.filter((seat) => seat.position === 'left');
  const rightSeats = seats.filter((seat) => seat.position === 'right');

  const renderSeatPod = (seat: PositionedSeat): ReactElement => {
    const player = playerById.get(seat.id);
    return (
      <div
        key={seat.id}
        data-seat-id={seat.id}
        data-active={seat.isActive}
        data-self={seat.isSelf}
        className={[
          'flex min-w-[7rem] max-w-[11rem] flex-col gap-1 rounded-xl border px-3 py-2 text-text-onBrand shadow-sm transition',
          seat.isActive
            ? 'border-brand-accent bg-surface-primary/25 ring-2 ring-brand-accent'
            : 'border-text-onBrand/20 bg-surface-primary/10',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-primary text-xs font-bold text-action-primary"
          >
            {seat.avatarInitial}
          </span>
          <span className="truncate text-sm font-bold">
            {seat.isSelf ? t.t('rooms.you') : seat.name}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[0.7rem] font-semibold">
          {player?.isDealer ? (
            <span className="rounded bg-brand-accent/40 px-1.5 py-0.5">
              {t.t('kachuful.dealerBadge')}
            </span>
          ) : null}
          <span className="rounded bg-surface-primary/20 px-1.5 py-0.5">
            {t.format('kachuful.bidTricksSeat', {
              bid: player?.bid ?? '—',
              won: player?.tricksWon ?? 0,
            })}
          </span>
          <span className="rounded bg-surface-primary/20 px-1.5 py-0.5">
            {t.format('kachuful.cardsLeftSeat', { count: seat.cardCount })}
          </span>
          {showRoundProjection && player && player.bid !== null
            ? (() => {
                const projected = projectedRoundScore(player.bid, player.tricksWon);
                const onTrack = player.bid === player.tricksWon;
                return (
                  <span
                    className={[
                      'rounded px-1.5 py-0.5',
                      onTrack ? 'bg-brand-accent/40' : 'bg-surface-primary/20 opacity-80',
                    ].join(' ')}
                  >
                    {t.format('kachuful.roundScoreSeat', { count: projected ?? 0 })}
                  </span>
                );
              })()
            : null}
        </div>
      </div>
    );
  };

  const renderTrick = (): ReactElement => {
    const ledGlyph = snapshot.ledSuit ? (SUIT_GLYPH[snapshot.ledSuit] ?? snapshot.ledSuit) : null;
    return (
      <div className="flex h-full min-h-[9rem] flex-col items-center justify-center gap-2 rounded-2xl bg-game-table/50 p-3">
        <div className="flex flex-wrap items-center justify-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wide text-text-onBrand/80">
          <span className="rounded-full bg-surface-primary/15 px-2 py-0.5">
            {t.format('kachuful.trumpLabel', { trump: trumpText })}
          </span>
          {ledGlyph ? (
            <span className="rounded-full bg-surface-primary/15 px-2 py-0.5">
              {t.format('kachuful.trickLedSuit', { suit: ledGlyph })}
            </span>
          ) : null}
        </div>
        {snapshot.currentTrick.length > 0 ? (
          <>
            <div className="flex flex-wrap items-end justify-center gap-3">
              {snapshot.currentTrick.map((entry) => {
                const isWinning = entry.playerId === winningId;
                return (
                  <div key={entry.playerId} className="flex flex-col items-center gap-1">
                    <div
                      className={
                        isWinning ? 'rounded-lg ring-2 ring-brand-accent ring-offset-1' : undefined
                      }
                    >
                      <PlayingCard card={entry.card} size="sm" label={cardLabel(entry.card)} />
                    </div>
                    <span className="text-xs font-semibold text-text-onBrand">
                      {nameFor(entry.playerId)}
                    </span>
                  </div>
                );
              })}
            </div>
            {winningId ? (
              <p className="text-xs font-bold text-brand-accent">
                {t.format('kachuful.trickWinning', { name: nameFor(winningId) })}
              </p>
            ) : null}
          </>
        ) : (
          <p className="max-w-[16rem] text-center text-xs font-semibold text-text-onBrand/80">
            {snapshot.currentPlayerId
              ? t.format('kachuful.trickWaiting', { name: nameFor(snapshot.currentPlayerId) })
              : t.t('kachuful.trickHeading')}
          </p>
        )}
      </div>
    );
  };

  const submit = useCallback(
    async (action: KachufulClientAction): Promise<void> => {
      if (busy) return;
      setBusy(true);
      setError(undefined);
      try {
        await submitKachufulAction(getSupabaseBrowserClient(), game.id, {
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

  const result = game.result as KachufulResult | null;
  const winnerNames = result ? result.winnerIds.map(nameFor) : [];
  const isSelfWinner = Boolean(result && result.winnerIds.includes(userId));

  const instruction = !isActive
    ? t.t('rooms.waitingToStart')
    : snapshot.phase === 'round_scored'
      ? t.t('kachuful.roundComplete')
      : isMyTurn
        ? snapshot.phase === 'bidding'
          ? t.t('kachuful.yourTurnBid')
          : t.t('kachuful.yourTurnPlay')
        : t.format('rooms.turnWaiting', { name: nameFor(snapshot.currentPlayerId ?? '') });

  const scoreboard = [...snapshot.players].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-background-canvas"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
    >
      <main className="min-h-screen px-3 py-4 text-text-primary sm:px-4 sm:py-6">
        <section className="mx-auto flex max-w-5xl flex-col gap-4">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-primary/95 p-3 shadow-md">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-accent">
                {gameLabel}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-text-primary">
                <span className="rounded-full bg-background-canvas px-3 py-1">
                  {t.format('kachuful.roundLabel', {
                    round: snapshot.roundNumber,
                    total: snapshot.totalRounds,
                  })}
                </span>
                <span className="rounded-full bg-game-table px-3 py-1 text-text-onBrand">
                  {t.format('kachuful.trumpLabel', { trump: trumpText })}
                </span>
                {code ? <span className="tracking-[0.25em] text-text-primary">{code}</span> : null}
              </p>
            </div>
            {onLeave ? (
              <button
                type="button"
                onClick={onLeave}
                className="rounded-md border border-action-primary px-3 py-1.5 text-sm font-bold text-action-primary transition hover:bg-background-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                {leaveLabel}
              </button>
            ) : null}
          </header>

          <p role="status" aria-live="polite" className="text-base font-semibold text-text-primary">
            {instruction}
          </p>

          <section
            aria-label={t.t('kachuful.tableLabel')}
            className="rounded-[1.75rem] border border-brand-accent/30 bg-game-table/95 p-3 shadow-lg sm:p-5"
          >
            {topSeats.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-3">
                {topSeats.map(renderSeatPod)}
              </div>
            ) : null}
            <div className="mt-3 flex items-stretch justify-between gap-3">
              <div className="flex flex-col justify-center gap-3">
                {leftSeats.map(renderSeatPod)}
              </div>
              <div className="min-w-0 flex-1">{renderTrick()}</div>
              <div className="flex flex-col justify-center gap-3">
                {rightSeats.map(renderSeatPod)}
              </div>
            </div>
            {selfSeat ? (
              <div className="mt-3 flex justify-center">{renderSeatPod(selfSeat)}</div>
            ) : null}
          </section>

          <details className="rounded-lg bg-surface-primary/95 p-3 shadow-sm">
            <summary className="cursor-pointer text-sm font-bold text-action-primary">
              {t.t('kachuful.scoreboardHeading')}
            </summary>
            {showRoundProjection ? (
              <p className="mt-2 text-xs text-text-secondary">{t.t('kachuful.roundScoreHint')}</p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {snapshot.players.map((player) => {
                const name = nameFor(player.id);
                const active = isActive && snapshot.currentPlayerId === player.id;
                return (
                  <div
                    key={player.id}
                    data-active={active}
                    className={[
                      'rounded-lg border p-3 shadow-sm transition',
                      active
                        ? 'border-action-primary bg-action-primary/10'
                        : 'border-brand-accent/40 bg-surface-primary',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-game-table text-sm font-bold text-text-onBrand"
                      >
                        {initialFor(name)}
                      </span>
                      <span className="truncate text-sm font-bold">{name}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      {player.isDealer ? (
                        <span className="rounded bg-brand-accent/30 px-1.5 py-0.5 font-semibold">
                          {t.t('kachuful.dealerBadge')}
                        </span>
                      ) : null}
                      <span className="rounded bg-background-canvas px-1.5 py-0.5 font-semibold">
                        {t.format('kachuful.bidTricksSeat', {
                          bid: player.bid ?? '—',
                          won: player.tricksWon,
                        })}
                      </span>
                    </div>
                    {showRoundProjection && player.bid !== null ? (
                      <p
                        className={[
                          'mt-1 text-xs font-semibold',
                          player.bid === player.tricksWon
                            ? 'text-action-primary'
                            : 'text-text-secondary',
                        ].join(' ')}
                      >
                        {t.format('kachuful.roundScoreProjected', {
                          count: projectedRoundScore(player.bid, player.tricksWon) ?? 0,
                        })}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs font-bold text-action-primary">
                      {t.format('kachuful.totalScore', { count: player.totalScore })}
                    </p>
                  </div>
                );
              })}
            </div>
          </details>

          {snapshot.phase === 'bidding' && isMyTurn ? (
            <section
              aria-label={t.t('kachuful.bidPrompt')}
              className="rounded-lg border border-action-primary/30 bg-surface-primary p-4 shadow-md"
            >
              <p className="text-sm font-bold text-action-primary">{t.t('kachuful.bidPrompt')}</p>
              <div
                className="mt-3 flex flex-wrap gap-2"
                role="group"
                aria-label={t.t('kachuful.bidPrompt')}
              >
                {Array.from({ length: snapshot.handSize + 1 }, (_, bid) => bid).map((bid) => {
                  const disabled = busy || !legalBids.includes(bid);
                  return (
                    <button
                      key={bid}
                      type="button"
                      disabled={disabled}
                      aria-label={t.format('kachuful.placeBid', { count: bid })}
                      className={[
                        'min-h-12 min-w-12 rounded-md border px-3 py-2 text-base font-bold transition',
                        disabled
                          ? 'cursor-not-allowed border-brand-accent/30 bg-background-canvas text-text-primary/40'
                          : 'border-action-primary bg-surface-primary text-action-primary hover:bg-action-primary hover:text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                      ].join(' ')}
                      onClick={() => void submit({ type: 'PLACE_BID', bid })}
                    >
                      {bid}
                    </button>
                  );
                })}
              </div>
              {forbiddenBid !== null ? (
                <p className="mt-2 text-xs leading-5 text-text-primary">
                  {t.format('kachuful.hookHint', { count: forbiddenBid })}
                </p>
              ) : null}
            </section>
          ) : null}

          <section
            aria-label={t.t('kachuful.yourHand')}
            className="rounded-lg bg-surface-primary p-3 shadow-md"
          >
            <p className="mb-2 text-xs font-semibold uppercase text-action-primary">
              {t.t('kachuful.yourHand')}
            </p>
            {mustFollowSuit && snapshot.ledSuit ? (
              <p className="mb-2 text-sm font-semibold text-action-primary">
                {t.format('kachuful.followSuitHint', {
                  suit: SUIT_GLYPH[snapshot.ledSuit] ?? snapshot.ledSuit,
                })}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {hand.map((card) => {
                const canPlay = snapshot.phase === 'playing' && isMyTurn && playable.has(card.id);
                const label = cardLabel(card);
                if (canPlay) {
                  return (
                    <button
                      key={card.id}
                      type="button"
                      disabled={busy}
                      aria-label={t.format('kachuful.playCardLabel', { card: label })}
                      className="rounded-lg ring-2 ring-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:opacity-60"
                      onClick={() => void submit({ type: 'PLAY_CARD', cardId: card.id })}
                    >
                      <PlayingCard card={card} size="md" label={label} />
                    </button>
                  );
                }
                return (
                  <div
                    key={card.id}
                    className={snapshot.phase === 'playing' && isMyTurn ? 'opacity-45' : undefined}
                  >
                    <PlayingCard card={card} size="md" label={label} />
                  </div>
                );
              })}
              {hand.length === 0 ? (
                <p className="text-sm text-text-primary">{t.t('kachuful.handEmpty')}</p>
              ) : null}
            </div>
          </section>

          {snapshot.phase === 'round_scored' ? (
            <section className="rounded-lg border border-action-primary/40 bg-surface-primary p-4 shadow-md">
              <h2 className="text-lg font-bold text-action-primary">
                {t.t('kachuful.roundComplete')}
              </h2>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit({ type: 'START_NEXT_ROUND' })}
                className="mt-4 min-h-12 w-full rounded-md bg-action-primary px-4 py-2 text-sm font-bold text-text-onBrand transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:pointer-events-none disabled:opacity-60"
              >
                {t.t('kachuful.nextRound')}
              </button>
            </section>
          ) : null}

          {error ? (
            <p className="rounded-md bg-status-error/95 px-3 py-1.5 text-center text-sm font-semibold text-text-onBrand shadow-md">
              {error}
            </p>
          ) : null}
        </section>
      </main>

      {game.status === 'complete' && result ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-w-sm flex-col items-center gap-2 rounded-lg bg-surface-primary px-5 py-4 text-center shadow-md">
            <span className="text-sm font-semibold uppercase text-action-primary">
              {t.t('kachuful.matchComplete')}
            </span>
            <span className="text-lg font-bold text-text-primary">
              {isSelfWinner
                ? t.t('kachuful.youWin')
                : winnerNames.length > 1
                  ? t.format('kachuful.winnersAnnounce', { names: winnerNames.join(', ') })
                  : t.format('kachuful.winnerAnnounce', { name: winnerNames[0] ?? '' })}
            </span>
            <ol className="mt-1 w-full space-y-1">
              {scoreboard.map((player, index) => (
                <li
                  key={player.id}
                  className={[
                    'flex items-center justify-between rounded-md px-3 py-2 text-sm',
                    player.id === userId
                      ? 'bg-action-primary/10 font-bold'
                      : 'bg-background-canvas',
                  ].join(' ')}
                >
                  <span>
                    {index + 1}. {nameFor(player.id)}
                  </span>
                  <span className="font-bold text-action-primary">
                    {t.format('kachuful.totalScore', { count: player.totalScore })}
                  </span>
                </li>
              ))}
            </ol>
            <RoomEndActions
              locale={locale}
              gameSlug={slug}
              gameName={gameLabel}
              {...(winnerNames[0] ? { winnerDisplayName: winnerNames[0] } : {})}
              playerCount={snapshot.players.length}
              onRematch={onRematch}
              busy={busy}
            />
            {onLeave ? (
              <button
                type="button"
                onClick={onLeave}
                className="mt-2 rounded-md border border-action-primary px-4 py-2 text-sm font-bold text-action-primary transition hover:bg-background-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
              >
                {leaveLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
