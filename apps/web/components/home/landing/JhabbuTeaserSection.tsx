import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

import { JhabbuArtwork } from './RichGameCard';

/**
 * Temporary "Coming next" teaser for Jhabbu. It sits between the play-mode
 * section and the family-connection section and is only rendered while Jhabbu
 * is the next major release (i.e. still coming soon). It deliberately shows a
 * single "Learn how to play" link to the crawlable detail page and NO Play
 * buttons — nothing here should look like a live game you can start yet.
 *
 * When Jhabbu ships, delete this section from GameLobby and promote Jhabbu into
 * the playable RichGameCard grid instead.
 */
export function JhabbuTeaserSection({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);

  return (
    <section
      className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8"
      aria-labelledby="landing-jhabbu-teaser-title"
    >
      <div className="grid items-center gap-6 overflow-hidden rounded-2xl border border-action-primary/15 bg-surface-primary shadow-md lg:grid-cols-2">
        <div className="order-2 flex flex-col gap-4 p-6 md:p-8 lg:order-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
              {t('landing.jhabbu.eyebrow')}
            </p>
            <span className="rounded-full bg-brand-accent/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-brand-accent">
              {t('games.status.comingSoon')}
            </span>
          </div>
          <div>
            <h2
              id="landing-jhabbu-teaser-title"
              className="text-3xl font-black text-action-primary md:text-4xl"
            >
              {t('games.jhabbu.name')}
            </h2>
            <p className="mt-1 text-lg font-black text-text-primary">
              {t('landing.jhabbu.native')}
            </p>
          </div>
          <p className="max-w-xl text-base leading-7 text-text-primary">
            {t('landing.jhabbu.tagline')}
          </p>
          <p className="text-sm font-semibold text-text-primary/70">
            {t('landing.jhabbu.aliasLine')}
          </p>
          <div className="mt-2">
            <Link
              href="/games/jhabbu"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary px-5 text-sm font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {t('landing.jhabbu.cta')}
            </Link>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <JhabbuArtwork locale={locale} />
        </div>
      </div>
    </section>
  );
}
