import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { MobileComputerSetupPage } from '../../../../../components/mobile/MobileComputerSetupPage';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function MobileGameSetupRoute({
  params,
}: {
  params: Promise<{ gameSlug: string }>;
}): Promise<ReactElement> {
  const { gameSlug } = await params;
  return <MobileComputerSetupPage gameSlug={gameSlug} />;
}
