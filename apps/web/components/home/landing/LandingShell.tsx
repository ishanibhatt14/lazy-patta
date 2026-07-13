import type { ReactElement, ReactNode } from 'react';

import './landing.css';

import { LandingTopNav } from './LandingTopNav';

export function LandingShell({ children }: { readonly children: ReactNode }): ReactElement {
  return (
    <main className="landing-shell min-h-screen">
      <LandingTopNav />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
