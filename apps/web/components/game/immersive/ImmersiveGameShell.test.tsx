import type { Card } from '@lazy-patta/game-contracts';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  ComputerGameSeat,
  ComputerGameViewState,
  HiddenCardSlot,
} from '../../../lib/computer-game/types';

import { ImmersiveGameShell } from './ImmersiveGameShell';

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

function renderShell(view: ComputerGameViewState, onChooseCard = noop, onRematch = noop) {
  return render(
    <ImmersiveGameShell
      view={view}
      locale={view.settings.locale}
      onChooseCard={onChooseCard}
      onRematch={onRematch}
      onRecover={noop}
      onToggleSound={noop}
      onToggleReducedMotion={noop}
      onLocaleChange={noop}
      onHowToPlay={noop}
    />,
  );
}

describe('ImmersiveGameShell', () => {
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
    renderShell(makeView({ hiddenCards: slots }), onChooseCard);

    expect(screen.getByText(/Pick from Ba's hand/i)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /Hidden card 1 from Ba/i });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onChooseCard).toHaveBeenCalledWith('tok-1');
  });

  it('hides the visible position number but keeps it in the accessible name', () => {
    const slots: HiddenCardSlot[] = [
      {
        ownerId: 'ba',
        ownerName: 'Ba',
        positionToken: 'tok-1',
        displayIndex: 1,
        isSelectable: true,
      },
    ];
    renderShell(makeView({ hiddenCards: slots }));
    // The owner+position label is on the button; no bare "1" digit is shown.
    expect(screen.getByRole('button', { name: /Hidden card 1 from Ba/i })).toBeInTheDocument();
    expect(screen.queryByText('1', { selector: 'span' })).toBeNull();
  });

  it('shows the human hand face-up with an accessible rank+suit label', () => {
    const { container } = renderShell(makeView());
    expect(screen.getByRole('img', { name: /Queen of Spades/i })).toBeInTheDocument();
    expect(container.querySelector('.gc-hand-rail')).not.toHaveClass('overflow-x-auto');
  });

  it('never renders an opponent card identity — only counts and decorative backs', () => {
    renderShell(makeView());
    expect(screen.getByText(/3 cards remaining/i)).toBeInTheDocument();
    // The only face-up card image is the human's own; no bot card labels leak.
    const faces = screen.getAllByRole('img', { name: /of (Clubs|Diamonds|Hearts|Spades)/i });
    expect(faces).toHaveLength(1);
  });

  it('offers no pickable cards when it is not the human turn', () => {
    renderShell(
      makeView({
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
      }),
    );
    expect(screen.queryByRole('button', { name: /Hidden card/i })).toBeNull();
  });

  it('exposes exactly one live turn status region', () => {
    renderShell(makeView());
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('renders the staged Gadha reveal with rematch, share, and return-home actions', () => {
    const onRematch = vi.fn();
    renderShell(
      makeView({
        phase: 'result',
        result: { gadhaChorIsSelf: false, gadhaChorName: 'Ba', winnerNames: ['You'] },
        currentTurn: { isSelf: false, name: '', seatId: null },
      }),
      noop,
      onRematch,
    );
    expect(screen.getByText(/Ba is the Gadha Chor!/i)).toBeInTheDocument();
    expect(screen.getByText(/Today's Gadha Chor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Share result/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Play again/i }));
    expect(onRematch).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: /Return home/i })).toHaveAttribute('href', '/');
  });

  it('uses the reduced-motion reveal animation when reduced motion is on', () => {
    const { container } = renderShell(
      makeView({
        settings: { playerCount: 2, locale: 'en', reducedMotion: true, soundEnabled: true },
        draw: {
          actorIsSelf: true,
          actorName: '',
          targetName: 'Ba',
          pairRemoved: false,
          drawnCard: card('hearts-7', 'hearts', '7'),
        },
      }),
    );
    expect(container.querySelector('.computer-pair-reduced')).not.toBeNull();
    expect(container.querySelector('.computer-pair-animation')).toBeNull();
  });

  it('opens the settings sheet from the top bar and closes it', () => {
    renderShell(makeView());
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Settings/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const [closeButton] = screen.getAllByRole('button', { name: /Close/i });
    fireEvent.click(closeButton!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders localized turn copy for the Hindi catalog', () => {
    renderShell(makeView({ settings: { ...makeView().settings, locale: 'hi' } }));
    expect(screen.getAllByText('आपकी बारी!').length).toBeGreaterThan(0);
  });

  const selectableSlots: HiddenCardSlot[] = [
    { ownerId: 'ba', ownerName: 'Ba', positionToken: 'tok-1', displayIndex: 1, isSelectable: true },
  ];

  it('shows the first-turn coach mark and clears it after the first draw', () => {
    const onChooseCard = vi.fn();
    renderShell(makeView({ hiddenCards: selectableSlots }), onChooseCard);

    expect(screen.getByText(/Your turn to draw/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Hidden card 1 from Ba/i }));
    expect(onChooseCard).toHaveBeenCalledWith('tok-1');
    expect(screen.queryByText(/Your turn to draw/i)).toBeNull();
  });

  it('lets the human dismiss the coach mark with "Got it"', () => {
    renderShell(makeView({ hiddenCards: selectableSlots }));
    fireEvent.click(screen.getByRole('button', { name: /Got it/i }));
    expect(screen.queryByText(/Your turn to draw/i)).toBeNull();
  });

  it('emphasizes the draw-source pod and dims the rest during the human draw', () => {
    const otherBot: ComputerGameSeat = { ...BOT_SEAT, id: 'kaka', name: 'Kaka', position: 'left' };
    const { container } = renderShell(
      makeView({ hiddenCards: selectableSlots, seats: [HUMAN_SEAT, BOT_SEAT, otherBot] }),
    );
    expect(container.querySelector('[data-seat-id="ba"]')).toHaveAttribute(
      'data-draw-source',
      'true',
    );
    expect(container.querySelector('[data-seat-id="kaka"]')).toHaveAttribute('data-dimmed', 'true');
    // The human's own pod is never dimmed or emphasized.
    expect(container.querySelector('[data-seat-id="you"]')).toHaveAttribute(
      'data-draw-source',
      'false',
    );
  });

  it('shows no coach mark or pod emphasis when it is not the human turn', () => {
    const { container } = renderShell(
      makeView({
        hiddenCards: [],
        currentTurn: { isSelf: false, name: 'Ba', seatId: 'ba' },
        seats: [
          { ...HUMAN_SEAT, isActive: false },
          { ...BOT_SEAT, isActive: true },
        ],
      }),
    );
    expect(screen.queryByText(/Your turn to draw/i)).toBeNull();
    expect(container.querySelector('[data-seat-id="ba"]')).toHaveAttribute(
      'data-draw-source',
      'false',
    );
  });
});
