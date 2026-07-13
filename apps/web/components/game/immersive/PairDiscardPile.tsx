import type { ReactElement } from 'react';

interface PairDiscardPileProps {
  /** True on the beat a pair was just cleared, to play the drop animation. */
  readonly justAdded: boolean;
}

/**
 * The central pile that cleared pairs move to. Purely a table motif — it holds
 * no card identities (pairs leave face-down) and never a running tally that the
 * projection doesn't expose. When a pair clears, the top card drops in.
 */
export function PairDiscardPile({ justAdded }: PairDiscardPileProps): ReactElement {
  return (
    <div className="gc-discard" data-just-added={justAdded ? 'true' : 'false'} aria-hidden>
      <span className="gc-discard-card" style={{ transform: 'rotate(-6deg)' }} />
      <span className="gc-discard-card" style={{ transform: 'rotate(2deg)' }} />
      <span className="gc-discard-card" style={{ transform: 'rotate(-4deg)' }} />
    </div>
  );
}
