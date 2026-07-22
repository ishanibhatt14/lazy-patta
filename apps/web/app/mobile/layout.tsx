import type { ReactElement, ReactNode } from 'react';

import { MobileShell } from '../../components/mobile/MobileShell';
import { MobilePreferencesProvider } from '../../lib/mobile/preferences';
import { ThemeProvider } from '../../lib/mobile/theme';

export default function MobileLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider>
      <MobilePreferencesProvider>
        <MobileShell>{children}</MobileShell>
      </MobilePreferencesProvider>
    </ThemeProvider>
  );
}
