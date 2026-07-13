import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { LAL_SATTI_TUTORIAL_STEPS } from '../../../components/game/lal-satti-tutorial-steps';
import { GameOverview } from '../../../components/home/GameOverview';

export const metadata: Metadata = {
  title: 'Lal Satti | Lazy Patta',
};

export default function LalSattiOverviewPage(): ReactElement {
  return (
    <GameOverview
      nameKey="games.lalSatti.name"
      descriptionKey="games.lalSatti.description"
      status="available"
      computerHref="/play/lal-satti/computer"
      onlineHref="/play/online"
      tutorialSteps={LAL_SATTI_TUTORIAL_STEPS}
    />
  );
}
