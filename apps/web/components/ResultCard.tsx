import type { ReactElement } from 'react';

import { Button } from './Button';

interface ResultCardProps {
  /** Localized winner headline, e.g. "Ravi wins!". */
  readonly winnerLabel: string;
  /** Localized Gadha Chor line, e.g. "Dev is the Gadha Chor!". */
  readonly gadhaChorLabel: string;
  /** Localized label for the rematch action. */
  readonly rematchLabel: string;
  /** Localized label for the exit action. */
  readonly exitLabel: string;
}

/** End-of-round summary: winner headline, Gadha Chor line, next actions. */
export function ResultCard({
  winnerLabel,
  gadhaChorLabel,
  rematchLabel,
  exitLabel,
}: ResultCardProps): ReactElement {
  return (
    <div className="flex w-80 flex-col items-center gap-4 rounded-lg bg-surface-primary p-6 text-center shadow-md">
      <span className="text-3xl font-bold text-action-primary">{winnerLabel}</span>

      <div className="w-full rounded-md bg-status-error px-4 py-2">
        <span className="text-sm font-semibold text-text-onBrand">{gadhaChorLabel}</span>
      </div>

      <div className="mt-2 flex w-full gap-3">
        <Button variant="primary" size="md" className="flex-1">
          {rematchLabel}
        </Button>
        <Button variant="ghost" size="md" className="flex-1">
          {exitLabel}
        </Button>
      </div>
    </div>
  );
}
