import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { MobileComputerGameRoute } from '../../../../../../components/mobile/MobileComputerGameRoute';

import '../../../../../play/gadha-chor/computer/computer-game.css';
import '../../../../../play/jhabbu/computer/jhabbu-game.css';
import '../../../../../play/lal-satti/computer/lal-satti-game.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function MobileComputerSessionRoute({
  params,
}: {
  params: Promise<{ gameSlug: string; sessionId: string }>;
}): Promise<ReactElement> {
  const { gameSlug, sessionId } = await params;
  return <MobileComputerGameRoute gameSlug={gameSlug} sessionId={sessionId} />;
}
