import { cardId, type Card, type PublicSnapshot } from '@lazy-patta/game-contracts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameRow } from '../../lib/online-game/games-client';
import type { KachufulPublicSnapshot } from '../../lib/online-game/kachuful-authority';
import type { RoomSeat } from '../../lib/rooms/rooms-client';

import { GameBoard } from './GameBoard';

const fetchLatestGame = vi.fn();
const fetchMyHand = vi.fn();
const drawCard = vi.fn();
const submitLalSattiAction = vi.fn();
const submitKachufulAction = vi.fn();

// A stub browser client with just enough Realtime surface for the board's
// subscribeToGame call: a chainable channel that records nothing, plus
// removeChannel for teardown. Reads/writes are mocked separately below.
vi.mock('../../lib/supabase/browser-client', () => {
  const channel = {
    on: (): unknown => channel,
    subscribe: (): unknown => channel,
  };
  return {
    getSupabaseBrowserClient: (): Record<string, unknown> => ({
      channel: () => channel,
      removeChannel: () => Promise.resolve({ status: 'ok' }),
    }),
  };
});

vi.mock('../../lib/online-game/games-client', () => ({
  fetchLatestGame: (...args: unknown[]) => fetchLatestGame(...args),
  fetchMyHand: (...args: unknown[]) => fetchMyHand(...args),
  drawCard: (...args: unknown[]) => drawCard(...args),
  submitLalSattiAction: (...args: unknown[]) => submitLalSattiAction(...args),
  submitKachufulAction: (...args: unknown[]) => submitKachufulAction(...args),
}));

function card(suit: Card['suit'], rank: Card['rank']): Card {
  return { id: cardId(suit, rank), suit, rank };
}

// A 3-seat Gadha Chor room: the viewer ("u1") plus two bots, on the viewer's turn.
const SEATS: readonly RoomSeat[] = [
  {
    id: 's0',
    room_id: 'r1',
    seat_index: 0,
    occupant: 'human',
    user_id: 'u1',
    display_name: 'Ishani',
    is_ready: true,
  },
  {
    id: 's1',
    room_id: 'r1',
    seat_index: 1,
    occupant: 'bot',
    user_id: null,
    display_name: 'Ba',
    is_ready: true,
  },
  {
    id: 's2',
    room_id: 'r1',
    seat_index: 2,
    occupant: 'bot',
    user_id: null,
    display_name: 'Kaka',
    is_ready: true,
  },
];

const GADHA_SNAPSHOT: PublicSnapshot = {
  rulePackId: 'gadha_chor',
  players: [
    { id: 'u1', handCount: 2, status: 'active', isBot: false },
    { id: 'bot:1', handCount: 3, status: 'active', isBot: true },
    { id: 'bot:2', handCount: 4, status: 'active', isBot: true },
  ],
  currentPlayerId: 'u1',
  phase: 'in_progress',
  stateVersion: 5,
};

const GADHA_GAME: GameRow = {
  id: 'g1',
  game_key: 'gadha_chor',
  status: 'active',
  state_version: 5,
  public_snapshot: GADHA_SNAPSHOT,
  result: null,
};

describe('GameBoard (online, immersive felt table)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchLatestGame.mockResolvedValue(GADHA_GAME);
    fetchMyHand.mockResolvedValue([card('hearts', '7'), card('spades', 'king')]);
    drawCard.mockResolvedValue({ stateVersion: 6 });
  });

  it('renders seated pods, the turn banner, and draws from the clockwise target', async () => {
    const user = userEvent.setup();
    render(<GameBoard roomId="r1" seats={SEATS} userId="u1" locale="en" />);

    // Opponent pods carry the bots' names on the felt (not a plain list row).
    expect(await screen.findByText('Ba')).toBeVisible();
    expect(screen.getByText('Kaka')).toBeVisible();

    // The viewer's turn banner is announced.
    expect(screen.getByText(/Your turn/i)).toBeVisible();

    // The draw target is the next active seat clockwise (bot:1, 3 cards), rendered
    // as pickable hidden cards — never a plain button list.
    const hidden = screen.getAllByRole('button', { name: /Hidden card \d+ from Ba/i });
    expect(hidden).toHaveLength(3);

    await user.click(hidden[0]!);
    expect(drawCard).toHaveBeenCalledTimes(1);
  });

  it('shows whose turn it is when it is not the viewer’s turn', async () => {
    fetchLatestGame.mockResolvedValue({
      ...GADHA_GAME,
      public_snapshot: { ...GADHA_SNAPSHOT, currentPlayerId: 'bot:1' },
    });

    render(<GameBoard roomId="r1" seats={SEATS} userId="u1" locale="en" />);

    expect(await screen.findByText(/Waiting for Ba/i)).toBeVisible();
    // No draw fan when it is not the viewer's turn.
    expect(screen.queryByRole('button', { name: /Hidden card/i })).toBeNull();
  });
});

describe('GameBoard (online, game-over overlay)', () => {
  const COMPLETE_GADHA: GameRow = {
    ...GADHA_GAME,
    status: 'complete',
    public_snapshot: { ...GADHA_SNAPSHOT, phase: 'completed', currentPlayerId: null },
    result: { winners: ['u1', 'bot:1'], loser: 'bot:2' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchLatestGame.mockResolvedValue(COMPLETE_GADHA);
    fetchMyHand.mockResolvedValue([]);
  });

  it('offers Play again to the host and reports the rematch upward', async () => {
    const user = userEvent.setup();
    const onRematch = vi.fn();
    render(<GameBoard roomId="r1" seats={SEATS} userId="u1" locale="en" onRematch={onRematch} />);

    expect(await screen.findByText(/game over/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: /Play again/i }));
    expect(onRematch).toHaveBeenCalledOnce();
    // Sharing is always available on the result card.
    expect(screen.getByRole('button', { name: /Share result/i })).toBeVisible();
  });

  it('omits Play again for a non-host viewer', async () => {
    render(<GameBoard roomId="r1" seats={SEATS} userId="u1" locale="en" />);

    expect(await screen.findByText(/game over/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Play again/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Share result/i })).toBeVisible();
  });
});

function kachufulPlayer(
  id: string,
  overrides: Partial<KachufulPublicSnapshot['players'][number]> = {},
): KachufulPublicSnapshot['players'][number] {
  return {
    id,
    seat: 0,
    handCount: 2,
    bid: 1,
    tricksWon: 0,
    roundScore: 0,
    totalScore: 0,
    isBot: id.startsWith('bot:'),
    isDealer: false,
    ...overrides,
  };
}

function kachufulGame(overrides: Partial<KachufulPublicSnapshot> = {}): GameRow {
  const snapshot: KachufulPublicSnapshot = {
    gameKey: 'kachuful',
    rulePackId: 'kachuful_family',
    players: [
      kachufulPlayer('u1', { seat: 0, tricksWon: 2, isDealer: true }),
      kachufulPlayer('bot:1', { seat: 1, bid: 2 }),
      kachufulPlayer('bot:2', { seat: 2, bid: 0 }),
    ],
    currentPlayerId: 'u1',
    phase: 'playing',
    trump: 'spades',
    handSize: 4,
    roundNumber: 2,
    totalRounds: 7,
    ledSuit: 'hearts',
    currentTrick: [{ playerId: 'bot:1', card: card('hearts', 'king'), sequence: 0 }],
    matchWinnerIds: [],
    stateVersion: 8,
    ...overrides,
  };
  return {
    id: 'g-kachuful',
    game_key: 'kachuful',
    status: 'active',
    state_version: snapshot.stateVersion,
    public_snapshot: snapshot,
    result: null,
  };
}

describe('GameBoard (online, Kachuful table)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A heart to follow with, plus an off-suit card that must be greyed out.
    fetchMyHand.mockResolvedValue([card('hearts', '7'), card('spades', '2')]);
  });

  it('renders the central trick with the winning card and a follow-suit hint', async () => {
    fetchLatestGame.mockResolvedValue(kachufulGame());

    render(<GameBoard roomId="r1" seats={SEATS} userId="u1" locale="en" />);

    // The led card sits in the central trick, not a hidden dashboard row.
    expect(await screen.findByRole('img', { name: /King of Hearts/i })).toBeVisible();
    // The board resolves and announces who is currently winning the trick.
    expect(screen.getByText(/Winning: Ba/i)).toBeVisible();
    expect(screen.getByText(/Led:/)).toBeVisible();
    // Because the viewer holds a heart, they are told they must follow suit.
    expect(screen.getByText(/you must follow suit/i)).toBeVisible();
    // Detailed standings are tucked into a collapsible summary, not always-on.
    expect(screen.getByText('Players and scores').tagName).toBe('SUMMARY');

    // Scores only lock at round end, so the board explains why the running total
    // sits still and shows a live "if it ended now" projection. Kaka (bid 0, won
    // 0) has met their bid so far, so they are on track for the flat 10 points —
    // rendered on their felt pod, not only in the collapsed scoreboard.
    expect(screen.getByText(/only when the round ends/i)).toBeInTheDocument();
    expect(screen.getByText('→ +10')).toBeVisible();
  });

  it('keeps the trick area visible while waiting for the lead', async () => {
    fetchLatestGame.mockResolvedValue(
      kachufulGame({ currentPlayerId: 'bot:1', ledSuit: null, currentTrick: [] }),
    );

    render(<GameBoard roomId="r1" seats={SEATS} userId="u1" locale="en" />);

    expect(await screen.findByText(/Waiting for Ba to lead/i)).toBeVisible();
  });
});
