import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { GADHA_CHOR_TUTORIAL_STEPS } from '../../../components/game/HowToPlayTutorial';
import { GameOverview } from '../../../components/home/GameOverview';
import { GAME_DISCOVERY, gameAlternates } from '../../../lib/game-discovery';
import { createTranslator } from '../../../lib/i18n';

const game = GAME_DISCOVERY['gadha-chor'];
const t = createTranslator('en');

export const metadata: Metadata = {
  title: t.t(game.metaTitleKey),
  description: t.t(game.metaDescriptionKey),
  alternates: gameAlternates(game.slug),
};

export default function GadhaChorOverviewPage(): ReactElement {
  return <GameOverview game={game} status="available" tutorialSteps={GADHA_CHOR_TUTORIAL_STEPS} />;
}
