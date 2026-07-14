import type { Locale } from '@lazy-patta/localization';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { Breadcrumbs } from '../../../components/seo/Breadcrumbs';
import {
  GAME_DISCOVERY,
  GAME_LOCALES,
  GAME_SLUGS,
  localizedGamePath,
} from '../../../lib/game-discovery';
import { createTranslator } from '../../../lib/i18n';
import { isLocale } from '../../../lib/locale/preference';
import { gamesIndexAlternates, gamesIndexPath, rulesPath } from '../../../lib/seo/routes';

interface GamesIndexParams {
  readonly locale: string;
}

function resolveLocaleParam(params: GamesIndexParams): Locale {
  if (!isLocale(params.locale)) notFound();
  return params.locale;
}

export function generateStaticParams(): GamesIndexParams[] {
  return GAME_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<GamesIndexParams>;
}): Promise<Metadata> {
  const locale = resolveLocaleParam(await params);
  const { t } = createTranslator(locale);
  const title = t('seo.gamesIndex.metaTitle');
  const description = t('seo.gamesIndex.metaDescription');

  return {
    title,
    description,
    alternates: gamesIndexAlternates(locale),
    openGraph: {
      title,
      description,
      type: 'website',
      url: gamesIndexPath(locale),
    },
  };
}

export default async function LocalizedGamesIndexPage({
  params,
}: {
  params: Promise<GamesIndexParams>;
}): Promise<ReactElement> {
  const locale = resolveLocaleParam(await params);
  const { t } = createTranslator(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <Breadcrumbs
        ariaLabel={t('seo.breadcrumb.games')}
        items={[
          { label: t('seo.breadcrumb.home'), href: '/' },
          { label: t('seo.breadcrumb.games'), href: gamesIndexPath(locale) },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black leading-tight text-action-primary">
          {t('seo.gamesIndex.heading')}
        </h1>
        <p className="text-base leading-7 text-text-primary">{t('seo.gamesIndex.intro')}</p>
      </div>

      <ul className="grid gap-4">
        {GAME_SLUGS.map((slug) => {
          const game = GAME_DISCOVERY[slug];
          return (
            <li key={slug} className="rounded-lg bg-surface-primary p-6 shadow-sm">
              <h2 className="text-2xl font-black text-action-primary">
                <Link href={localizedGamePath(locale, slug)} className="hover:underline">
                  {t(game.nameKey)}
                </Link>
              </h2>
              <p className="mt-1 text-sm font-semibold text-text-primary/70">
                {t(game.aliasShortKey)}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-primary">{t(game.descriptionKey)}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
                <Link
                  href={localizedGamePath(locale, slug)}
                  className="text-action-primary hover:underline"
                >
                  {t('seo.cta.viewGame')}
                </Link>
                <Link
                  href={rulesPath(locale, slug)}
                  className="text-action-primary hover:underline"
                >
                  {t('seo.cta.readRules')}
                </Link>
                {game.playable ? (
                  <Link href={game.computerHref} className="text-action-primary hover:underline">
                    {t('seo.cta.playComputer')}
                  </Link>
                ) : (
                  <span className="font-semibold text-brand-accent">
                    {t('games.status.comingSoon')}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
