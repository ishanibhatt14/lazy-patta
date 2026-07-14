import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { RoomLobby } from '../../../components/rooms/RoomLobby';

/**
 * Canonical room-invite / deep-link landing route. Invite links and mobile
 * Universal Links / App Links all target `/join/<code>`; on the web this renders
 * the room lobby directly. Private rooms hold no durable public content, so the
 * page is excluded from the sitemap and disallowed in robots.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function JoinRoomPage({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}): Promise<ReactElement> {
  const { roomCode } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-12">
      <RoomLobby code={roomCode.toUpperCase()} />
    </main>
  );
}
