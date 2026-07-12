import type { ReactElement } from 'react';

interface PlayerSeatProps {
  readonly name: string;
  /** Single-character avatar glyph (e.g. first initial). */
  readonly avatarInitial: string;
  /** Whether it is this player's turn — draws the active highlight. */
  readonly isActive?: boolean;
  /** Whether this player ended as the Gadha Chor (the round's loser). */
  readonly isGadhaChor?: boolean;
  /** Optional localized status line, e.g. "Your turn!" — supplied by caller. */
  readonly statusLabel?: string;
  /** Optional localized badge text for the Gadha Chor marker. */
  readonly badgeLabel?: string;
}

/** A seat at the table: avatar, name, active-turn highlight, loser badge. */
export function PlayerSeat({
  name,
  avatarInitial,
  isActive = false,
  isGadhaChor = false,
  statusLabel,
  badgeLabel,
}: PlayerSeatProps): ReactElement {
  return (
    <div
      className={[
        'flex w-28 flex-col items-center gap-2 rounded-lg bg-surface-primary px-3 py-4 text-center shadow-sm transition',
        isActive ? 'ring-2 ring-action-secondary' : 'ring-1 ring-transparent',
      ].join(' ')}
    >
      <div
        className={[
          'flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold',
          isGadhaChor ? 'bg-status-error text-text-onBrand' : 'bg-brand-accent text-text-onBrand',
          isActive ? 'scale-105' : '',
        ].join(' ')}
        aria-hidden
      >
        {avatarInitial}
      </div>

      <span className="max-w-full truncate text-sm font-semibold text-text-primary">{name}</span>

      {isGadhaChor && badgeLabel ? (
        <span className="rounded-md bg-status-error px-2 py-0.5 text-xs font-semibold text-text-onBrand">
          {badgeLabel}
        </span>
      ) : null}

      {statusLabel ? (
        <span className="text-xs font-medium text-action-primary">{statusLabel}</span>
      ) : null}
    </div>
  );
}
