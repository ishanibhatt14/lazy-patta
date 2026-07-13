import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { LAL_SATTI_TUTORIAL_STEPS } from '../../../components/game/lal-satti-tutorial-steps';
import { GameOverview } from '../../../components/home/GameOverview';
import { GAME_DISCOVERY, gameAlternates } from '../../../lib/game-discovery';
import { createTranslator } from '../../../lib/i18n';

const game = GAME_DISCOVERY['lal-satti'];
const t = createTranslator('en');

export const metadata: Metadata = {
  title: t.t(game.metaTitleKey),
  description: t.t(game.metaDescriptionKey),
  alternates: gameAlternates(game.slug),
};

export default function LalSattiOverviewPage(): ReactElement {
  return <GameOverview game={game} status="available" tutorialSteps={LAL_SATTI_TUTORIAL_STEPS} />;
}
