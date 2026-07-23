import type { ReactElement, ReactNode } from 'react';

import { AuthContextProvider } from '../../../lib/auth/auth-context';

/**
 * Family Groups live behind auth, like the online rooms. Mounting the provider
 * only here keeps guest computer play free of any Supabase dependency.
 */
export default function FamilyLayout({ children }: { children: ReactNode }): ReactElement {
  return <AuthContextProvider>{children}</AuthContextProvider>;
}
