import type { ReactElement, ReactNode } from 'react';

import { AuthContextProvider } from '../../../lib/auth/auth-context';

/**
 * Auth is mounted only around the online routes. Guest computer play under
 * `/play/computer` never loads the Supabase client, so it keeps working with no
 * environment configured at all.
 */
export default function OnlineLayout({ children }: { children: ReactNode }): ReactElement {
  return <AuthContextProvider>{children}</AuthContextProvider>;
}
