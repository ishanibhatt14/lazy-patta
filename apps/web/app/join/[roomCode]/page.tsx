import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { RoomLobby } from '../../../components/rooms/RoomLobby';
import { normalizeRoomCode } from '../../../lib/room-invite';

/**
 * Canonical room-invite / deep-link landing route. Invite links and mobile
 * Universal Links / App Links all target `/join/<code>`; on the web this renders
 * the room lobby directly. Private rooms hold no durable public content, so the
 * page is excluded from the sitemap and disallowed in robots.
 */
function gameName(value: string | undefined): string | undefined {
  if (value === 'lal-satti' || value === 'lal_satti') return 'Lal Satti';
  if (value === 'jhabbu') return 'Jhabbu';
  if (value === 'kachuful') return 'Kachuful';
  if (value === 'gadha-chor' || value === 'gadha_chor') return 'Gadha Chor';
  return undefined;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ roomCode: string }>;
  searchParams: Promise<{ game?: string }>;
}): Promise<Metadata> {
  const [{ roomCode }, query] = await Promise.all([params, searchParams]);
  const code = normalizeRoomCode(roomCode);
  const game = gameName(query.game);
  const title = game ? `Join ${game} on Lazy Patta` : 'Join a family game on Lazy Patta';
  const description = game
    ? `Family game invitation for ${game}. Room ${code}.`
    : 'A private table is waiting. Enter your name and join the game.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: 'Lazy Patta',
      type: 'website',
      images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'Lazy Patta' }],
    },
  };
}

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
