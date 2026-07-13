import type { ReactElement } from 'react';

import { ReactionIconPlaceholder, type ReactionKind } from '../../../../components/game/art';

interface ReactionBubbleProps {
  readonly kind: ReactionKind;
  readonly text: string;
}

/**
 * A short, affectionate reaction that pops above a pod. Decorative and
 * aria-hidden: the same beat is announced through the live status region and the
 * game-history drawer, so the bubble never duplicates screen-reader output.
 */
export function ReactionBubble({ kind, text }: ReactionBubbleProps): ReactElement {
  return (
    <span
      aria-hidden
      className="ls-reaction pointer-events-none absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-full bg-background-canvas px-2.5 py-1 text-xs font-bold text-action-primary shadow-md"
    >
      <ReactionIconPlaceholder kind={kind} />
      {text}
    </span>
  );
}
