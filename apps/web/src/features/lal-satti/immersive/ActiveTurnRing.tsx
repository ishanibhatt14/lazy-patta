import type { ReactElement, ReactNode } from 'react';

interface ActiveTurnRingProps {
  readonly active: boolean;
  readonly children: ReactNode;
}

/**
 * Wraps an avatar with the animated active-turn ring. The ring is decorative
 * (color only) — callers must always pair it with a non-color textual marker so
 * the current turn is conveyed without relying on the ring alone.
 */
export function ActiveTurnRing({ active, children }: ActiveTurnRingProps): ReactElement {
  return (
    <span className="relative inline-flex">
      {children}
      <span className="ls-pod-ring" data-active={active ? 'true' : 'false'} aria-hidden />
    </span>
  );
}
