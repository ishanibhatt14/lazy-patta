import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function MobileGameRoute({
  params,
}: {
  params: Promise<{ gameSlug: string }>;
}): Promise<ReactElement> {
  const { gameSlug } = await params;
  redirect(`/mobile/game/${gameSlug}/setup?mode=computer`);
}
