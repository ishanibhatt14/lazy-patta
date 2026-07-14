import { cardId, type Card, type PublicSnapshot } from '@lazy-patta/game-contracts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameRow } from '../../lib/online-game/games-client';
import type { RoomSeat } from '../../lib/rooms/rooms-client';

import { GameBoard } from './GameBoard';

const fetchLatestGame = vi.fn();
const fetchMyHand = vi.fn();
const drawCard = vi.fn();
const submitLalSattiAction = vi.fn();

vi.mock('../../lib/supabase/browser-client', () => ({
  getSupabaseBrowserClient: (): Record<string, never> => ({}),
}));

vi.mock('../../lib/online-game/games-client', () => ({
  fetchLatestGame: (...args: unknown[]) => fetchLatestGame(...args),
  fetchMyHand: (...args: unknown[]) => fetchMyHand(...args),
  drawCard: (...args: unknown[]) => drawCard(...args),
  submitLalSattiAction: (...args: unknown[]) => submitLalSattiAction(...args),
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
