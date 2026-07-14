import type { Locale } from '@lazy-patta/localization';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';

import { Breadcrumbs } from '../../../../components/seo/Breadcrumbs';
import { JsonLd } from '../../../../components/seo/JsonLd';
import {
  GAME_DISCOVERY,
  GAME_LOCALES,
  GAME_SLUGS,
  localizedGamePath,
  type GameSlug,
} from '../../../../lib/game-discovery';
import { createTranslator } from '../../../../lib/i18n';
import { isLocale } from '../../../../lib/locale/preference';
import { rulesAlternates, rulesIndexPath, rulesPath } from '../../../../lib/seo/routes';
import { RULES_CONTENT } from '../../../../lib/seo/rules-content';
import { faqPageJsonLd } from '../../../../lib/seo/structured-data';

interface RulesDetailParams {
  readonly locale: string;
  readonly slug: string;
}

function resolveParams(params: RulesDetailParams): {
  readonly locale: Locale;
  readonly slug: GameSlug;
} {
  if (!isLocale(params.locale)) notFound();
  if (!GAME_SLUGS.includes(params.slug as GameSlug)) notFound();
  return { locale: params.locale, slug: params.slug as GameSlug };
}

export function generateStaticParams(): RulesDetailParams[] {
  return GAME_LOCALES.flatMap((locale) => GAME_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RulesDetailParams>;
}): Promise<Metadata> {
  const { locale, slug } = resolveParams(await params);
  const content = RULES_CONTENT[slug];
  const { t } = createTranslator(locale);
  const title = t(content.metaTitleKey);
  const description = t(content.metaDescriptionKey);

  return {
    title,
    description,
    alternates: rulesAlternates(slug, locale),
    openGraph: {
      title,
      description,
      type: 'article',
      url: rulesPath(locale, slug),
    },
  };
}

export default async function LocalizedRulesDetailPage({
  params,
}: {
  params: Promise<RulesDetailParams>;
}): Promise<ReactElement> {
  const { locale, slug } = resolveParams(await params);
  const game = GAME_DISCOVERY[slug];
  const content = RULES_CONTENT[slug];
  const { t } = createTranslator(locale);
  const otherSlug = GAME_SLUGS.find((s) => s !== slug);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <Breadcrumbs
        ariaLabel={t('seo.breadcrumb.howToPlay')}
        items={[
          { label: t('seo.breadcrumb.home'), href: '/' },
          { label: t('seo.breadcrumb.howToPlay'), href: rulesIndexPath(locale) },
          { label: t(game.nameKey), href: rulesPath(locale, slug) },
        ]}
      />

      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-black leading-tight text-action-primary">
          {t(content.headingKey)}
        </h1>
        <p className="text-base leading-7 text-text-primary">{t(content.introKey)}</p>
      </header>

      <div className="flex flex-col gap-6">
        {content.sections.map((section) => (
          <section key={section.bodyKey} className="flex flex-col gap-2">
            <h2 className="text-2xl font-black text-action-primary">{t(section.headingKey)}</h2>
            <p className="whitespace-pre-line text-base leading-7 text-text-primary">
              {t(section.bodyKey)}
            </p>
          </section>
        ))}
      </div>

      {/* Coming-soon games have no Play routes yet, so the "try it now" panel
          becomes a rules-first coming-soon note with no Play links. */}
      {game.playable ? (
        <section className="rounded-lg bg-surface-primary p-6 shadow-sm">
          <h2 className="text-2xl font-black text-action-primary">
            {t('seo.rules.practiceHeading')}
          </h2>
          <p className="mt-2 text-base leading-7 text-text-primary">{t('seo.rules.practiceBody')}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <Link
              href={game.computerHref}
              className="rounded-md bg-action-primary px-4 py-2 text-white hover:opacity-90"
            >
              {t('seo.cta.playComputer')}
            </Link>
            {/* Some games have a live computer mode but no online/family play
                yet — surface a clear "coming soon" affordance instead of a
                link to a route that does not exist. */}
            {game.onlinePlayable ? (
              <Link
                href={game.onlineHref}
                className="rounded-md border border-action-primary px-4 py-2 text-action-primary hover:bg-background-canvas"
              >
                {t('seo.cta.playOnline')}
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="cursor-not-allowed rounded-md border border-action-primary/20 px-4 py-2 text-text-primary/50"
              >
                {t('seo.cta.playOnline')} · {t('games.status.comingSoon')}
              </span>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-lg bg-surface-primary p-6 shadow-sm">
          <h2 className="text-2xl font-black text-action-primary">
            {t('seo.rules.comingSoonHeading')}
          </h2>
          <p className="mt-2 text-base leading-7 text-text-primary">
            {t('seo.rules.comingSoonBody')}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <JsonLd
          data={faqPageJsonLd(
            content.faq.map((item) => ({
              question: t(item.questionKey),
              answer: t(item.answerKey),
            })),
          )}
        />
        <h2 className="text-2xl font-black text-action-primary">{t('seo.rules.heading.faq')}</h2>
        <dl className="flex flex-col gap-4">
          {content.faq.map((item) => (
            <div key={item.questionKey} className="rounded-lg bg-surface-primary p-5 shadow-sm">
              <dt className="text-lg font-bold text-action-primary">{t(item.questionKey)}</dt>
              <dd className="mt-2 text-base leading-7 text-text-primary">{t(item.answerKey)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-black text-action-primary">{t('seo.related.heading')}</h2>
        <ul className="flex flex-col gap-2 text-sm font-semibold">
          <li>
            <Link
              href={localizedGamePath(locale, slug)}
              className="text-action-primary hover:underline"
            >
              {t('seo.cta.viewGame')}
            </Link>
          </li>
          {otherSlug ? (
            <li>
              <Link
                href={rulesPath(locale, otherSlug)}
                className="text-action-primary hover:underline"
              >
                {t(GAME_DISCOVERY[otherSlug].nameKey)}
              </Link>
            </li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
