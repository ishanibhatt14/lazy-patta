import type { Locale } from '@lazy-patta/localization';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { GADHA_CHOR_TUTORIAL_STEPS } from '../../../../components/game/HowToPlayTutorial';
import { LAL_SATTI_TUTORIAL_STEPS } from '../../../../components/game/lal-satti-tutorial-steps';
import { GameOverview } from '../../../../components/home/GameOverview';
import { JsonLd } from '../../../../components/seo/JsonLd';
import {
  GAME_DISCOVERY,
  GAME_LOCALES,
  GAME_SLUGS,
  gameAlternates,
  type GameSlug,
} from '../../../../lib/game-discovery';
import { createTranslator } from '../../../../lib/i18n';
import { isLocale } from '../../../../lib/locale/preference';
import { videoGameJsonLd } from '../../../../lib/seo/structured-data';

interface LocalizedGameParams {
  readonly locale: string;
  readonly slug: string;
}

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

  return {
    title: t.t(game.metaTitleKey),
    description: t.t(game.metaDescriptionKey),
    alternates: gameAlternates(game.slug, resolved.locale),
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
  const tutorialSteps =
    resolved.slug === 'gadha-chor' ? GADHA_CHOR_TUTORIAL_STEPS : LAL_SATTI_TUTORIAL_STEPS;

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
      <GameOverview
        game={game}
        localeOverride={resolved.locale}
        status="available"
        tutorialSteps={tutorialSteps}
      />
    </>
  );
}
