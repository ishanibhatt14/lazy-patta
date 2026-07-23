import { Suspense, type ReactElement } from 'react';

import { RoomsInstallNudge } from '../../../components/mobile/RoomsInstallNudge';
import { OnlineHub } from '../../../components/rooms/OnlineHub';
import { AuthContextProvider } from '../../../lib/auth/auth-context';

/**
 * The mobile family-rooms tab. Private rooms are now verified live against
 * production Supabase (a 2-device create -> join -> shared-lobby round-trip on
 * lazypatta.com), so this renders the real create/join hub rather than a
 * "coming soon" panel. Auth is mounted only here — the rest of mobile (guest
 * computer play) never loads the Supabase client. OnlineHub reads ?game=<key>
 * to preselect the game and routes lobby links back under /mobile/rooms/<code>.
 */
export default function MobileRoomsPage(): ReactElement {
  return (
    <AuthContextProvider>
      <div className="flex flex-col items-center gap-4">
        <RoomsInstallNudge />
        <Suspense fallback={null}>
          <OnlineHub />
        </Suspense>
      </div>
    </AuthContextProvider>
  );
}
