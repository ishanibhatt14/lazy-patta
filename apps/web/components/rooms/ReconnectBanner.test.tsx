import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PRESENCE_ABANDON_MS, PRESENCE_GRACE_MS } from '../../lib/rooms/presence';
import type { RoomSeat } from '../../lib/rooms/rooms-client';

import { ReconnectBanner } from './ReconnectBanner';

function seat(overrides: Partial<RoomSeat>): RoomSeat {
  return {
    id: overrides.id ?? 's0',
    room_id: 'r1',
    seat_index: overrides.seat_index ?? 0,
    occupant: overrides.occupant ?? 'human',
    user_id: overrides.user_id ?? null,
    display_name: overrides.display_name ?? null,
    is_ready: true,
    ...overrides,
  };
}

function ago(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

describe('ReconnectBanner', () => {
  it('renders nothing while every human seat is present', () => {
    const { container } = render(
      <ReconnectBanner
        seats={[
          seat({ id: 's0', user_id: 'u1', display_name: 'Ishani', last_seen_at: ago(0) }),
          seat({ id: 's1', user_id: 'u2', display_name: 'Ba', last_seen_at: ago(2_000) }),
        ]}
        userId="u1"
        locale="en"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('names another player who is reconnecting within the grace window', () => {
    render(
      <ReconnectBanner
        seats={[
          seat({ id: 's0', user_id: 'u1', display_name: 'Ishani', last_seen_at: ago(0) }),
          seat({
            id: 's1',
            user_id: 'u2',
            display_name: 'Ba',
            last_seen_at: ago(PRESENCE_GRACE_MS + 5_000),
          }),
        ]}
        userId="u1"
        locale="en"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/Ba reconnecting/i);
  });

  it('shows the first-person note when the viewer themselves is reconnecting', () => {
    render(
      <ReconnectBanner
        seats={[
          seat({
            id: 's0',
            user_id: 'u1',
            display_name: 'Ishani',
            last_seen_at: ago(PRESENCE_GRACE_MS + 5_000),
          }),
        ]}
        userId="u1"
        locale="en"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/Reconnecting to the table/i);
  });

  it('does not announce a seat that has passed into the gone state', () => {
    const { container } = render(
      <ReconnectBanner
        seats={[
          seat({
            id: 's1',
            user_id: 'u2',
            display_name: 'Ba',
            last_seen_at: ago(PRESENCE_ABANDON_MS + 5_000),
          }),
        ]}
        userId="u1"
        locale="en"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('ignores bot seats entirely', () => {
    const { container } = render(
      <ReconnectBanner
        seats={[seat({ id: 's1', occupant: 'bot', display_name: 'Kaka', last_seen_at: ago(0) })]}
        userId="u1"
        locale="en"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
