import type { ReactElement } from 'react';

import { RoomLobby } from '../../../../components/rooms/RoomLobby';

export default async function RoomLobbyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<ReactElement> {
  const { code } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-6 py-12">
      <RoomLobby code={code.toUpperCase()} />
    </main>
  );
}
