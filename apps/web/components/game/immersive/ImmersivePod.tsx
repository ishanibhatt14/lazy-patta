import type { ReactElement, ReactNode } from 'react';

import { AvatarPlaceholder } from '../art';

interface ImmersivePodProps {
  /** Roster id (drives the avatar tone) or the human seat id. */
  readonly seatId: string;
  readonly initial: string;
  readonly name: string;
  readonly isSelf: boolean;
  readonly isActive?: boolean;
  readonly isFinished?: boolean;
  readonly avatarSize?: number;
  /** Primary badge under the name (e.g. card count, bid/won). */
  readonly badge?: ReactNode;
  /** Whether the primary badge should read as an accent chip. */
  readonly badgeTone?: 'default' | 'accent';
  /** Small uppercase tag beside the name (e.g. Dealer, Power). */
  readonly tag?: ReactNode;
  /** Screen-reader-only text appended when this seat is active. */
  readonly activeMarker?: string;
}

/**
 * A seat around the shared immersive rim: an avatar in an animated active-turn
 * ring, the player name, an optional stat badge, and an optional tag. The ring
 * is colour-only, so an active pod also carries a screen-reader "current turn"
 * marker. Generic over game — each board maps its own seat shape onto these
 * props.
 */
export function ImmersivePod({
  seatId,
  initial,
  name,
  isSelf,
  isActive = false,
  isFinished = false,
  avatarSize = 44,
  badge,
  badgeTone = 'default',
  tag,
  activeMarker,
}: ImmersivePodProps): ReactElement {
  return (
    <div
      className="imm-pod"
      data-seat-id={seatId}
      data-active={isActive ? 'true' : 'false'}
      data-finished={isFinished ? 'true' : 'false'}
      data-self={isSelf ? 'true' : 'false'}
    >
      <span className="imm-pod-ring">
        <AvatarPlaceholder seatId={seatId} initial={initial} isSelf={isSelf} size={avatarSize} />
      </span>

      <span className="imm-pod-name">{name}</span>

      {tag ? <span className="imm-pod-tag">{tag}</span> : null}

      {badge ? (
        <span className="imm-pod-badge" data-tone={badgeTone}>
          {badge}
        </span>
      ) : null}

      {isActive && activeMarker ? <span className="sr-only">{activeMarker}</span> : null}
    </div>
  );
}
