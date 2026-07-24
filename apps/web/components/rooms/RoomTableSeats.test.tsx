import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createTranslator } from '../../lib/i18n';

import { RoomTableSeats, type LobbyTableSeat } from './RoomTableSeats';

const t = createTranslator('en');

function seat(overrides: Partial<LobbyTableSeat>): LobbyTableSeat {
  return {
    id: 'seat-1',
    occupant: 'human',
    displayName: null,
    isReady: false,
    isYou: false,
    isHost: false,
    ...overrides,
  };
}

describe('RoomTableSeats', () => {
  it('renders the table heading', () => {
    render(<RoomTableSeats seats={[]} t={t} />);
    expect(screen.getByRole('heading', { name: /who's at the table/i })).toBeVisible();
  });

  it('shows a "saving a seat" placeholder for empty seats', () => {
    render(<RoomTableSeats seats={[seat({ id: 'e1', occupant: 'empty' })]} t={t} />);
    expect(screen.getByText(/saving a seat/i)).toBeVisible();
  });

  it('marks the host with a crown and the "You" suffix for the current player', () => {
    render(
      <RoomTableSeats
        seats={[seat({ id: 'h1', displayName: 'Nani', isHost: true, isYou: true })]}
        t={t}
      />,
    );
    expect(screen.getByText(/Nani/)).toBeVisible();
    expect(screen.getByText(/\(You\)/)).toBeVisible();
    // The crown badge is labelled for assistive tech.
    expect(screen.getAllByLabelText(/host/i).length).toBeGreaterThan(0);
  });

  it('reflects ready state in the pill', () => {
    render(
      <RoomTableSeats
        seats={[
          seat({ id: 'r1', displayName: 'A', isReady: true }),
          seat({ id: 'r2', displayName: 'B', isReady: false }),
        ]}
        t={t}
      />,
    );
    expect(screen.getByText(/^Ready$/)).toBeVisible();
    expect(screen.getByText(/not ready/i)).toBeVisible();
  });

  it('injects a per-seat safety menu only where provided', () => {
    render(
      <RoomTableSeats
        seats={[seat({ id: 'm1', displayName: 'Guest', occupant: 'human' })]}
        t={t}
        safetyMenuFor={(seatId) => <button type="button">menu-{seatId}</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'menu-m1' })).toBeVisible();
  });

  it('falls back to a generic bot label when a bot has no name', () => {
    render(<RoomTableSeats seats={[seat({ id: 'b1', occupant: 'bot' })]} t={t} />);
    expect(screen.getAllByText(/computer player/i).length).toBeGreaterThan(0);
  });
});
