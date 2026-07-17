import type { ReactElement, ReactNode } from 'react';

import { AuthContextProvider } from '../../lib/auth/auth-context';

/**
 * Shared room invites land under `/join/<code>`, outside the `/play/online`
 * route group, so they need the same auth provider as the online lobby.
 */
export default function JoinLayout({ children }: { children: ReactNode }): ReactElement {
  return <AuthContextProvider>{children}</AuthContextProvider>;
}
