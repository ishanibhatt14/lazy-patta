import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { JHABBU_TUTORIAL_STEPS } from '../../../components/game/jhabbu-tutorial-steps';
import { GameOverview } from '../../../components/home/GameOverview';
import { JsonLd } from '../../../components/seo/JsonLd';
import { GAME_DISCOVERY, gameAlternates } from '../../../lib/game-discovery';
import { createTranslator } from '../../../lib/i18n';
import { videoGameJsonLd } from '../../../lib/seo/structured-data';

const game = GAME_DISCOVERY.jhabbu;
const t = createTranslator('en');

export const metadata: Metadata = {
  title: t.t(game.metaTitleKey),
  description: t.t(game.metaDescriptionKey),
  alternates: gameAlternates(game.slug),
};

export default function JhabbuOverviewPage(): ReactElement {
  // Jhabbu is live: GameOverview renders the Play Computer / Play Online CTAs
  // (registry `computerHref` → /play/jhabbu/computer) alongside the rules.
  return (
    <>
      <JsonLd
        data={videoGameJsonLd({
          slug: game.slug,
          locale: 'en',
          name: t.t(game.nameKey),
          description: t.t(game.descriptionKey),
        })}
      />
      <GameOverview game={game} status="available" tutorialSteps={JHABBU_TUTORIAL_STEPS} />
    </>
  );
}
