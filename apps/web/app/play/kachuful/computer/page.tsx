import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

export default async function KachufulComputerPage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}): Promise<ReactElement> {
  const { seed } = await searchParams;
  redirect(
    `/mobile/game/kachuful/setup?mode=computer${seed ? `&seed=${encodeURIComponent(seed)}` : ''}`,
  );
}
