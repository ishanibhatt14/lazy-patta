import type { ReactElement } from 'react';

import { Button } from './Button';

interface RoomCardProps {
  readonly name: string;
  /** Localized host line, e.g. "Hosted by Asha". */
  readonly hostLabel: string;
  /** Localized player count, e.g. "3 players". */
  readonly playersLabel: string;
  /** Localized label for the join action button. */
  readonly joinLabel: string;
  /** Whether the room can still be joined. */
  readonly isJoinable?: boolean;
}

/** A joinable room in the lobby list. */
export function RoomCard({
  name,
  hostLabel,
  playersLabel,
  joinLabel,
  isJoinable = true,
}: RoomCardProps): ReactElement {
  return (
    <div className="flex w-72 items-center justify-between gap-4 rounded-lg bg-surface-primary p-4 shadow-sm">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${isJoinable ? 'bg-brand-accent' : 'bg-status-error'}`}
            aria-hidden
          />
          <span className="truncate text-base font-semibold text-text-primary">{name}</span>
        </div>
        <span className="truncate text-sm text-text-primary">{hostLabel}</span>
        <span className="text-xs font-medium text-action-primary">{playersLabel}</span>
      </div>

      <Button variant="secondary" size="sm" disabled={!isJoinable}>
        {joinLabel}
      </Button>
    </div>
  );
}
