import type { ReactElement } from 'react';

import { CardFanArtwork, type FanCard } from './CardFanArtwork';

/**
 * The Lazy Patta brand hero: a small gold crown resting on a fan of cards above
 * the wordmark. Built from local SVG + the shared card fan (no image asset), and
 * coloured with theme tokens so it works on both the cream and plum canvases.
 * "Lazy Patta" is a brand name and is intentionally not localized.
 */

const HERO_FAN: readonly FanCard[] = [
  { rank: '10', suit: 'diamonds' },
  { rank: 'J', suit: 'clubs' },
  { rank: 'Q', suit: 'hearts' },
  { rank: 'K', suit: 'spades' },
  { rank: 'A', suit: 'diamonds' },
];

function Crown(): ReactElement {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 32"
      className="h-7 w-11 text-action-secondary drop-shadow-sm"
      fill="currentColor"
    >
      <path d="M4 28h40l3-18-11 8L24 4 12 18 1 10z" />
      <circle cx="24" cy="3" r="3" />
      <circle cx="2" cy="9" r="2.5" />
      <circle cx="46" cy="9" r="2.5" />
    </svg>
  );
}

export function LazyPattaLogoMark({ className }: { readonly className?: string }): ReactElement {
  return (
    <div className={`flex flex-col items-center ${className ?? ''}`}>
      <div className="relative flex items-end justify-center">
        <span className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Crown />
        </span>
        <CardFanArtwork cards={HERO_FAN} size="md" />
      </div>
      <p className="mt-2 bg-gradient-to-b from-action-secondary to-action-primary bg-clip-text text-3xl font-black uppercase italic leading-none tracking-tight text-transparent drop-shadow-sm">
        Lazy Patta
      </p>
    </div>
  );
}
