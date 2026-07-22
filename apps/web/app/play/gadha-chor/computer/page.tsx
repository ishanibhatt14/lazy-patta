import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

export const metadata: Metadata = {
  title: 'Play Computer | Lazy Patta',
};

export default async function ComputerGamePage({
  searchParams,
}: {
  searchParams: Promise<{ seed?: string }>;
}): Promise<ReactElement> {
  const { seed } = await searchParams;
  redirect(
    `/mobile/game/gadha-chor/setup?mode=computer${seed ? `&seed=${encodeURIComponent(seed)}` : ''}`,
  );
}
