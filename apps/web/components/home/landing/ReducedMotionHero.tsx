import type { ReactElement } from 'react';

export function ReducedMotionHero({ label }: { readonly label: string }): ReactElement {
  return (
    <div className="sr-only" aria-live="polite">
      {label}
    </div>
  );
}
