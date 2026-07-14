import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

import { HeroFamilyImage } from './HeroFamilyImage';

export function AnimatedHero({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);
  const trust = [
    t('landing.hero.trust.noCash'),
    t('landing.hero.trust.guest'),
    t('landing.hero.trust.rooms'),
    t('landing.hero.trust.languages'),
  ];

  return (
    <section
      className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-8 pt-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:items-center md:gap-10 md:px-8 md:pb-12"
      aria-labelledby="landing-hero-title"
    >
      <div className="landing-hero-copy flex flex-col gap-6">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
          {t('landing.hero.eyebrow')}
        </p>
        <div className="flex flex-col gap-4">
          <h1
            id="landing-hero-title"
            className="max-w-3xl text-5xl font-black leading-none text-action-primary md:text-7xl"
          >
            {t('landing.hero.headline')}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-text-primary md:text-xl">
            {t('landing.hero.body')}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/play/gadha-chor/computer"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-action-primary px-5 py-3 font-bold text-text-onBrand shadow-md transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('landing.hero.primaryCta')}
          </Link>
          <Link
            href="#games"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary bg-surface-primary px-5 py-3 font-bold text-action-primary transition hover:bg-action-primary hover:text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('landing.hero.secondaryCta')}
          </Link>
          <Link
            href="/play/online?game=gadha_chor"
            className="inline-flex min-h-12 items-center justify-center rounded-md px-5 py-3 font-bold text-action-primary underline decoration-action-secondary decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('landing.hero.tertiaryCta')}
          </Link>
        </div>

        <ul
          className="flex flex-wrap gap-2 text-sm font-bold text-text-primary"
          aria-label={t('landing.trust.label')}
        >
          {trust.map((item) => (
            <li
              key={item}
              className="rounded-full border border-action-primary/20 bg-surface-primary px-3 py-2 leading-5"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="landing-hero-copy relative">
        <HeroFamilyImage locale={locale} />
      </div>
    </section>
  );
}
