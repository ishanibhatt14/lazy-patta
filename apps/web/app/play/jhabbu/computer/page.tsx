import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

import './jhabbu-game.css';

export default async function JhabbuComputerPage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}): Promise<ReactElement> {
  const { seed } = await searchParams;
  redirect(
    `/mobile/game/jhabbu/setup?mode=computer${seed ? `&seed=${encodeURIComponent(seed)}` : ''}`,
  );
}
