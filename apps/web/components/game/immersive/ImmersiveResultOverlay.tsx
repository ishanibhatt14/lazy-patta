import type { ReactElement, ReactNode } from 'react';

import { Button } from '../../Button';
import { AvatarPlaceholder } from '../art';

interface ImmersiveResultOverlayProps {
  readonly open: boolean;
  /** Small uppercase eyebrow (e.g. "Round complete", "Match complete"). */
  readonly eyebrow: string;
  /** The celebrated headline (e.g. "You got away first!", "Ba wins"). */
  readonly title: string;
  /** Optional celebrated seat, shown as a large avatar medallion. */
  readonly hero?: {
    readonly seatId: string;
    readonly initial: string;
    readonly isSelf: boolean;
  } | null;
  /** Optional highlighted line under the title (e.g. match leader). */
  readonly highlight?: ReactNode;
  /** Standings / stats body. */
  readonly children?: ReactNode;
  readonly playAgainLabel: string;
  readonly onRematch: () => void;
  /** Optional secondary action (e.g. view scores). */
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly returnHomeLabel: string;
  readonly titleId?: string;
}

/**
 * The shared end-of-game celebration. The table dims, the winner (or the
 * human's finishing position) is honoured with a large medallion, standings
 * sit in a soft panel, and the player is offered Play Again, an optional
 * secondary action, and a gentle way home. Warm and affectionate — a family
 * table moment, never a casino payout.
 */
export function ImmersiveResultOverlay({
  open,
  eyebrow,
  title,
  hero = null,
  highlight,
  children,
  playAgainLabel,
  onRematch,
  secondaryLabel,
  onSecondary,
  returnHomeLabel,
  titleId = 'imm-result-title',
}: ImmersiveResultOverlayProps): ReactElement | null {
  if (!open) return null;

  return (
    <div className="imm-result-backdrop absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className="flex max-h-[90dvh] w-full max-w-md flex-col items-center gap-4 overflow-y-auto rounded-2xl bg-surface-primary p-6 text-center shadow-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p className="text-sm font-black uppercase tracking-widest text-brand-accent">{eyebrow}</p>

        {hero ? (
          <span className="imm-result-badge inline-flex">
            <AvatarPlaceholder
              seatId={hero.seatId}
              initial={hero.initial}
              isSelf={hero.isSelf}
              size={96}
            />
          </span>
        ) : null}

        <h2 id={titleId} className="text-2xl font-black text-action-primary">
          {title}
        </h2>

        {highlight ? (
          <p className="w-full rounded-xl bg-brand-accent px-4 py-2 text-sm font-bold text-text-onBrand">
            {highlight}
          </p>
        ) : null}

        {children}

        <div className="flex w-full flex-wrap justify-center gap-2">
          <Button onClick={onRematch}>{playAgainLabel}</Button>
          {secondaryLabel && onSecondary ? (
            <Button variant="secondary" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
          <a
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-action-primary underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {returnHomeLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
