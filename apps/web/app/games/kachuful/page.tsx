import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { KACHUFUL_TUTORIAL_STEPS } from '../../../components/game/kachuful-tutorial-steps';
import { GameOverview } from '../../../components/home/GameOverview';
import { JsonLd } from '../../../components/seo/JsonLd';
import { GAME_DISCOVERY, gameAlternates } from '../../../lib/game-discovery';
import { createTranslator } from '../../../lib/i18n';
import { videoGameJsonLd } from '../../../lib/seo/structured-data';

const game = GAME_DISCOVERY.kachuful;
const t = createTranslator('en');

export const metadata: Metadata = {
  title: t.t(game.metaTitleKey),
  description: t.t(game.metaDescriptionKey),
  alternates: gameAlternates(game.slug),
};

export default function KachufulOverviewPage(): ReactElement {
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
      <GameOverview game={game} status="available" tutorialSteps={KACHUFUL_TUTORIAL_STEPS} />
    </>
  );
}
