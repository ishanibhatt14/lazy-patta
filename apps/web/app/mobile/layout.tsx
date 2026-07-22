import type { ReactElement, ReactNode } from 'react';

import { MobileShell } from '../../components/mobile/MobileShell';
import { MobilePreferencesProvider } from '../../lib/mobile/preferences';

export default function MobileLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <MobilePreferencesProvider>
      <MobileShell>{children}</MobileShell>
    </MobilePreferencesProvider>
  );
}
