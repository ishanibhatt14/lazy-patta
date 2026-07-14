import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { JHABBU_TUTORIAL_STEPS } from '../../../components/game/jhabbu-tutorial-steps';
import { GameOverview } from '../../../components/home/GameOverview';
import { GAME_DISCOVERY, gameAlternates } from '../../../lib/game-discovery';
import { createTranslator } from '../../../lib/i18n';

const game = GAME_DISCOVERY.jhabbu;
const t = createTranslator('en');

export const metadata: Metadata = {
  title: t.t(game.metaTitleKey),
  description: t.t(game.metaDescriptionKey),
  alternates: gameAlternates(game.slug),
};

export default function JhabbuOverviewPage(): ReactElement {
  // Jhabbu is coming soon: GameOverview renders the rules-first card with no
  // Play buttons while `status` is `comingSoon`.
  return <GameOverview game={game} status="comingSoon" tutorialSteps={JHABBU_TUTORIAL_STEPS} />;
}
