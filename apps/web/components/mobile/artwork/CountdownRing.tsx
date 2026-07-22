import type { ReactElement } from 'react';

import { REMATCH_COUNTDOWN_SECONDS } from '../../../lib/rematch/rematch-state';

/**
 * A radial countdown ring for the rematch auto-start. The gold arc drains as the
 * remaining seconds fall, with the number centred inside. Pure presentation —
 * the parent owns the ticking `seconds` value.
 */
export function CountdownRing({
  seconds,
  total = REMATCH_COUNTDOWN_SECONDS,
}: {
  readonly seconds: number;
  readonly total?: number;
}): ReactElement {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const fraction = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const offset = circumference * (1 - fraction);

  return (
    <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center">
      <svg viewBox="0 0 52 52" className="h-14 w-14 -rotate-90" aria-hidden>
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          strokeWidth="4"
          className="stroke-action-secondary/25"
        />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-action-secondary transition-[stroke-dashoffset] duration-1000 ease-linear"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-lg font-black text-action-primary">{seconds}</span>
    </span>
  );
}
