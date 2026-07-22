import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { RoomLobby } from '../../../../../components/rooms/RoomLobby';
import { AuthContextProvider } from '../../../../../lib/auth/auth-context';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function MobileRoomLobbyRoute({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}): Promise<ReactElement> {
  const { roomCode } = await params;
  return (
    <AuthContextProvider>
      <RoomLobby code={roomCode.toUpperCase()} />
    </AuthContextProvider>
  );
}
