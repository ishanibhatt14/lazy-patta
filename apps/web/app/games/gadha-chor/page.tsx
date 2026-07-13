import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { GADHA_CHOR_TUTORIAL_STEPS } from '../../../components/game/HowToPlayTutorial';
import { GameOverview } from '../../../components/home/GameOverview';

export const metadata: Metadata = {
  title: 'Gadha Chor | Lazy Patta',
};

export default function GadhaChorOverviewPage(): ReactElement {
  return (
    <GameOverview
      nameKey="games.gadhaChor.name"
      descriptionKey="games.gadhaChor.description"
      status="available"
      computerHref="/play/gadha-chor/computer"
      onlineHref="/play/online"
      tutorialSteps={GADHA_CHOR_TUTORIAL_STEPS}
    />
  );
}
