import type { ReactElement } from 'react';

import { PatternBackground } from './PatternBackground';

/** A small crown mark, echoing the logo, for the winner/result banner. */
function CrownMark(): ReactElement {
  return (
    <svg
      viewBox="0 0 48 32"
      width={40}
      height={27}
      className="text-action-secondary drop-shadow"
      fill="currentColor"
      aria-hidden
    >
      <path d="M4 26h40l-3-16-9 7-8-13-8 13-9-7z" />
      <circle cx="4" cy="8" r="3" />
      <circle cx="24" cy="4" r="3" />
      <circle cx="44" cy="8" r="3" />
      <rect x="6" y="27" width="36" height="4" rx="2" />
    </svg>
  );
}

/**
 * A celebratory, gold-crowned banner for end-of-round results and rematch
 * headers. Warm and family-friendly — never cash or leaderboard framing. Pure
 * presentation: the caller supplies the eyebrow label and the headline name.
 */
export function WinnerBanner({
  eyebrow,
  headline,
  className = '',
}: {
  readonly eyebrow: string;
  readonly headline: string;
  readonly className?: string;
}): ReactElement {
  return (
    <div
      className={`relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-action-secondary/40 bg-gradient-to-b from-action-primary to-action-primary/80 px-5 py-4 text-center shadow-md ${className}`}
    >
      <PatternBackground className="text-text-onBrand" opacity={0.1} />
      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <CrownMark />
        <span className="text-[0.7rem] font-black uppercase tracking-[0.2em] text-action-secondary">
          {eyebrow}
        </span>
        <span className="text-2xl font-black leading-tight text-text-onBrand">{headline}</span>
      </div>
    </div>
  );
}
