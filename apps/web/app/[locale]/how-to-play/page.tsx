import type { Locale } from '@lazy-patta/localization';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { Breadcrumbs } from '../../../components/seo/Breadcrumbs';
import { GAME_DISCOVERY, GAME_LOCALES, GAME_SLUGS } from '../../../lib/game-discovery';
import { createTranslator } from '../../../lib/i18n';
import { isLocale } from '../../../lib/locale/preference';
import { rulesIndexAlternates, rulesIndexPath, rulesPath } from '../../../lib/seo/routes';

interface RulesIndexParams {
  readonly locale: string;
}

function resolveLocaleParam(params: RulesIndexParams): Locale {
  if (!isLocale(params.locale)) notFound();
  return params.locale;
}

export function generateStaticParams(): RulesIndexParams[] {
  return GAME_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RulesIndexParams>;
}): Promise<Metadata> {
  const locale = resolveLocaleParam(await params);
  const { t } = createTranslator(locale);
  const title = t('seo.rulesIndex.metaTitle');
  const description = t('seo.rulesIndex.metaDescription');

  return {
    title,
    description,
    alternates: rulesIndexAlternates(locale),
    openGraph: {
      title,
      description,
      type: 'website',
      url: rulesIndexPath(locale),
    },
  };
}

export default async function LocalizedRulesIndexPage({
  params,
}: {
  params: Promise<RulesIndexParams>;
}): Promise<ReactElement> {
  const locale = resolveLocaleParam(await params);
  const { t } = createTranslator(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <Breadcrumbs
        ariaLabel={t('seo.breadcrumb.howToPlay')}
        items={[
          { label: t('seo.breadcrumb.home'), href: '/' },
          { label: t('seo.breadcrumb.howToPlay'), href: rulesIndexPath(locale) },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black leading-tight text-action-primary">
          {t('seo.rulesIndex.heading')}
        </h1>
        <p className="text-base leading-7 text-text-primary">{t('seo.rulesIndex.intro')}</p>
      </div>

      <ul className="grid gap-4">
        {GAME_SLUGS.map((slug) => {
          const game = GAME_DISCOVERY[slug];
          return (
            <li key={slug} className="rounded-lg bg-surface-primary p-6 shadow-sm">
              <h2 className="text-2xl font-black text-action-primary">
                <Link href={rulesPath(locale, slug)} className="hover:underline">
                  {t(game.nameKey)}
                </Link>
              </h2>
              <p className="mt-1 text-sm font-semibold text-text-primary/70">
                {t(game.aliasShortKey)}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-primary">{t(game.descriptionKey)}</p>
              <Link
                href={rulesPath(locale, slug)}
                className="mt-4 inline-block text-sm font-semibold text-action-primary hover:underline"
              >
                {t('seo.cta.readRules')}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
