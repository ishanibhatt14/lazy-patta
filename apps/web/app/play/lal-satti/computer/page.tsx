import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

import './lal-satti-game.css';

export default async function LalSattiComputerPage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}): Promise<ReactElement> {
  const { seed } = await searchParams;
  redirect(
    `/mobile/game/lal-satti/setup?mode=computer${seed ? `&seed=${encodeURIComponent(seed)}` : ''}`,
  );
}
