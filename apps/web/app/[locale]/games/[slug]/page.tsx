import type { Locale } from '@lazy-patta/localization';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import type { TutorialStep } from '../../../../components/game/HowToPlayTutorial';
import { GADHA_CHOR_TUTORIAL_STEPS } from '../../../../components/game/HowToPlayTutorial';
import { JHABBU_TUTORIAL_STEPS } from '../../../../components/game/jhabbu-tutorial-steps';
import { KACHUFUL_TUTORIAL_STEPS } from '../../../../components/game/kachuful-tutorial-steps';
import { LAL_SATTI_TUTORIAL_STEPS } from '../../../../components/game/lal-satti-tutorial-steps';
import { GameOverview } from '../../../../components/home/GameOverview';
import { Breadcrumbs } from '../../../../components/seo/Breadcrumbs';
import { JsonLd } from '../../../../components/seo/JsonLd';
import {
  GAME_DISCOVERY,
  GAME_LOCALES,
  GAME_SLUGS,
  gameAlternates,
  localizedGamePath,
  type GameSlug,
} from '../../../../lib/game-discovery';
import { createTranslator } from '../../../../lib/i18n';
import { isLocale } from '../../../../lib/locale/preference';
import { gamesIndexPath } from '../../../../lib/seo/routes';
import { videoGameJsonLd } from '../../../../lib/seo/structured-data';

interface LocalizedGameParams {
  readonly locale: string;
  readonly slug: string;
}

/** Slug → tutorial steps. Keeps the page registry-driven as games are added. */
const TUTORIAL_STEPS: Record<GameSlug, readonly TutorialStep[]> = {
  'gadha-chor': GADHA_CHOR_TUTORIAL_STEPS,
  'lal-satti': LAL_SATTI_TUTORIAL_STEPS,
  jhabbu: JHABBU_TUTORIAL_STEPS,
  kachuful: KACHUFUL_TUTORIAL_STEPS,
};

function resolveParams(params: LocalizedGameParams): {
  readonly locale: Locale;
  readonly slug: GameSlug;
} {
  if (!isLocale(params.locale)) notFound();
  if (!GAME_SLUGS.includes(params.slug as GameSlug)) notFound();
  return { locale: params.locale, slug: params.slug as GameSlug };
}

export function generateStaticParams(): LocalizedGameParams[] {
  return GAME_LOCALES.flatMap((locale) => GAME_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LocalizedGameParams>;
}): Promise<Metadata> {
  const resolved = resolveParams(await params);
  const game = GAME_DISCOVERY[resolved.slug];
  const t = createTranslator(resolved.locale);
  const title = t.t(game.metaTitleKey);
  const description = t.t(game.metaDescriptionKey);

  return {
    title,
    description,
    alternates: gameAlternates(game.slug, resolved.locale),
    openGraph: {
      title,
      description,
      type: 'website',
      url: localizedGamePath(resolved.locale, resolved.slug),
    },
  };
}

export default async function LocalizedGameOverviewPage({
  params,
}: {
  params: Promise<LocalizedGameParams>;
}): Promise<ReactElement> {
  const resolved = resolveParams(await params);
  const game = GAME_DISCOVERY[resolved.slug];
  const { t } = createTranslator(resolved.locale);
  const tutorialSteps = TUTORIAL_STEPS[resolved.slug];

  return (
    <>
      <JsonLd
        data={videoGameJsonLd({
          slug: resolved.slug,
          locale: resolved.locale,
          name: t(game.nameKey),
          description: t(game.descriptionKey),
        })}
      />
      <div className="mx-auto w-full max-w-5xl px-6 pt-6">
        <Breadcrumbs
          ariaLabel={t('seo.breadcrumb.games')}
          items={[
            { label: t('seo.breadcrumb.home'), href: '/' },
            { label: t('seo.breadcrumb.games'), href: gamesIndexPath(resolved.locale) },
            { label: t(game.nameKey), href: localizedGamePath(resolved.locale, resolved.slug) },
          ]}
        />
      </div>
      <GameOverview
        game={game}
        localeOverride={resolved.locale}
        status={game.playable ? 'available' : 'comingSoon'}
        tutorialSteps={tutorialSteps}
      />
    </>
  );
}
