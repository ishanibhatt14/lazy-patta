import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { GADHA_CHOR_TUTORIAL_STEPS } from '../../../components/game/HowToPlayTutorial';
import { GameOverview } from '../../../components/home/GameOverview';
import { Breadcrumbs } from '../../../components/seo/Breadcrumbs';
import { JsonLd } from '../../../components/seo/JsonLd';
import { defaultGamePath, GAME_DISCOVERY, gameAlternates } from '../../../lib/game-discovery';
import { createTranslator } from '../../../lib/i18n';
import { videoGameJsonLd } from '../../../lib/seo/structured-data';

const game = GAME_DISCOVERY['gadha-chor'];
const t = createTranslator('en');

export const metadata: Metadata = {
  title: t.t(game.metaTitleKey),
  description: t.t(game.metaDescriptionKey),
  alternates: gameAlternates(game.slug),
  openGraph: {
    title: t.t(game.metaTitleKey),
    description: t.t(game.metaDescriptionKey),
    type: 'website',
    url: defaultGamePath(game.slug),
  },
};

export default function GadhaChorOverviewPage(): ReactElement {
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
      <div className="mx-auto w-full max-w-5xl px-6 pt-6">
        <Breadcrumbs
          ariaLabel={t.t('seo.breadcrumb.games')}
          items={[
            { label: t.t('seo.breadcrumb.home'), href: '/' },
            { label: t.t(game.nameKey), href: defaultGamePath(game.slug) },
          ]}
        />
      </div>
      <GameOverview game={game} status="available" tutorialSteps={GADHA_CHOR_TUTORIAL_STEPS} />
    </>
  );
}
