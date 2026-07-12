import type { Card } from '@lazy-patta/game-contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  ComputerGameSeat,
  ComputerGameViewState,
  HiddenCardSlot,
} from '../../lib/computer-game/types';

import { GameTable } from './GameTable';

function card(id: string, suit: Card['suit'], rank: Card['rank']): Card {
  return { id, suit, rank };
}

const HUMAN_SEAT: ComputerGameSeat = {
  id: 'you',
  name: '',
  avatarInitial: '★',
  cardCount: 2,
  isSelf: true,
  isActive: true,
  isFinished: false,
  position: 'bottom',
};

const BOT_SEAT: ComputerGameSeat = {
  id: 'ba',
  name: 'Ba',
  avatarInitial: 'બ',
  cardCount: 3,
  isSelf: false,
  isActive: false,
  isFinished: false,
  position: 'top',
};

function makeView(overrides: Partial<ComputerGameViewState> = {}): ComputerGameViewState {
  return {
    phase: 'playing',
    settings: { playerCount: 2, locale: 'en', reducedMotion: false, soundEnabled: true },
    seats: [HUMAN_SEAT, BOT_SEAT],
    ownHand: [card('spades-queen', 'spades', 'queen')],
    hiddenCards: [],
    currentTurn: { isSelf: true, name: '', seatId: 'you' },
    draw: undefined,
    result: undefined,
    instructionKey: 'turn.pickOneCard',
    statusKey: 'turn.yours',
    events: [],
    recoverableError: false,
    ...overrides,
  };
}

const noop = (): void => {};

describe('GameTable', () => {
  it('renders selectable hidden cards on the human turn and reports the chosen token', () => {
    const onChooseCard = vi.fn();
    const slots: HiddenCardSlot[] = [
      {
        ownerId: 'ba',
        ownerName: 'Ba',
        positionToken: 'tok-1',
        displayIndex: 1,
        isSelectable: true,
      },
    ];
    render(
      <GameTable
        view={makeView({ hiddenCards: slots })}
        locale="en"
        onChooseCard={onChooseCard}
        onRematch={noop}
        onRecover={noop}
      />,
    );

    const button = screen.getByRole('button', { name: /Hidden card 1 from Ba/i });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onChooseCard).toHaveBeenCalledWith('tok-1');
  });

  it('shows the human hand face-up with an accessible rank+suit label', () => {
    render(
      <GameTable
        view={makeView()}
        locale="en"
        onChooseCard={noop}
        onRematch={noop}
        onRecover={noop}
      />,
    );
    expect(screen.getByRole('img', { name: /Queen of Spades/i })).toBeInTheDocument();
  });

  it('never renders an opponent card identity — only counts and face-down backs', () => {
    render(
      <GameTable
        view={makeView()}
        locale="en"
        onChooseCard={noop}
        onRematch={noop}
        onRecover={noop}
      />,
    );
    // Opponent seat is present with a card count, but no readable card face.
    expect(screen.getByText(/3 cards remaining/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /of (Clubs|Diamonds|Hearts|Spades)/i })).toBeTruthy();
    // The only face-up card image is the human's own; no bot card labels leak.
    const faces = screen.getAllByRole('img', { name: /of (Clubs|Diamonds|Hearts|Spades)/i });
    expect(faces).toHaveLength(1);
  });

  it('offers no pickable cards when it is not the human turn', () => {
    render(
      <GameTable
        view={makeView({
          hiddenCards: [],
          currentTurn: { isSelf: false, name: 'Ba', seatId: 'ba' },
          seats: [
            { ...HUMAN_SEAT, isActive: false },
            { ...BOT_SEAT, isActive: true },
          ],
          instructionKey: 'turn.waiting',
          instructionValues: { name: 'Ba' },
          statusKey: 'turn.waiting',
          statusValues: { name: 'Ba' },
        })}
        locale="en"
        onChooseCard={noop}
        onRematch={noop}
        onRecover={noop}
      />,
    );
    expect(screen.queryByRole('button', { name: /Hidden card/i })).toBeNull();
  });

  it('renders the result overlay with rematch and return-home actions', () => {
    const onRematch = vi.fn();
    render(
      <GameTable
        view={makeView({
          phase: 'result',
          result: { gadhaChorIsSelf: false, gadhaChorName: 'Ba', winnerNames: ['You'] },
          currentTurn: { isSelf: false, name: '', seatId: null },
        })}
        locale="en"
        onChooseCard={noop}
        onRematch={onRematch}
        onRecover={noop}
      />,
    );
    expect(screen.getByText(/Ba is the Gadha Chor!/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Play again/i }));
    expect(onRematch).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: /Return home/i })).toHaveAttribute('href', '/');
  });

  it('uses the reduced-motion reveal animation when reduced motion is on', () => {
    const { container } = render(
      <GameTable
        view={makeView({
          settings: { playerCount: 2, locale: 'en', reducedMotion: true, soundEnabled: true },
          draw: {
            actorIsSelf: true,
            actorName: '',
            targetName: 'Ba',
            pairRemoved: false,
            drawnCard: card('hearts-7', 'hearts', '7'),
          },
        })}
        locale="en"
        onChooseCard={noop}
        onRematch={noop}
        onRecover={noop}
      />,
    );
    expect(container.querySelector('.computer-pair-reduced')).not.toBeNull();
    expect(container.querySelector('.computer-pair-animation')).toBeNull();
  });

  it('renders localized turn copy for the Hindi catalog', () => {
    render(
      <GameTable
        view={makeView()}
        locale="hi"
        onChooseCard={noop}
        onRematch={noop}
        onRecover={noop}
      />,
    );
    expect(screen.getAllByText('आपकी बारी!').length).toBeGreaterThan(0);
  });
});
