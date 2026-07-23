'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';

import { LandingFooter } from './landing/LandingFooter';
import { LandingShell } from './landing/LandingShell';

const games = [
  {
    key: 'gadha-chor',
    nameKey: 'games.gadhaChor.name',
    aliasKey: 'games.gadhaChor.aliasShort',
    descriptionKey: 'games.gadhaChor.description',
    computerHref: '/play/gadha-chor/computer',
    onlineHref: '/play/online?game=gadha_chor',
  },
  {
    key: 'lal-satti',
    nameKey: 'games.lalSatti.name',
    aliasKey: 'games.lalSatti.aliasShort',
    descriptionKey: 'games.lalSatti.description',
    computerHref: '/play/lal-satti/computer',
    onlineHref: '/play/online?game=lal_satti',
  },
  {
    key: 'jhabbu',
    nameKey: 'games.jhabbu.name',
    aliasKey: 'games.jhabbu.aliasShort',
    descriptionKey: 'games.jhabbu.description',
    computerHref: '/play/jhabbu/computer',
    onlineHref: '/play/online?game=jhabbu',
  },
] as const;

export function PlayLauncher(): ReactElement {
  const { locale } = usePreferredLocale();
  const { t } = createTranslator(locale);

  return (
    <LandingShell>
      <section
        className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 pb-10 pt-6 md:px-8 md:pb-14 md:pt-10"
        aria-labelledby="play-launcher-title"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
              {t('mobile.hero.eyebrow')}
            </p>
            <h1
              id="play-launcher-title"
              className="mt-3 text-4xl font-black leading-tight text-action-primary md:text-6xl"
            >
              {t('lobby.chooseGame')}
            </h1>
            <p className="mt-4 text-base leading-7 text-text-primary">{t('mobile.games.body')}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/play/online"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary/30 bg-surface-primary px-5 text-sm font-bold text-action-primary shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {t('mobile.hero.secondaryCta')}
            </Link>
            <Link
              href="/play/family"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary/30 bg-surface-primary px-5 text-sm font-bold text-action-primary shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {t('family.hubTitle')}
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3" id="games">
          {games.map((game) => (
            <article
              key={game.key}
              className="flex flex-col rounded-lg border border-action-primary/15 bg-surface-primary p-5 shadow-sm"
            >
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
                {t('games.status.available')}
              </p>
              <h2 className="mt-3 text-3xl font-black text-action-primary">{t(game.nameKey)}</h2>
              <p className="mt-1 text-sm font-bold text-text-primary">{t(game.aliasKey)}</p>
              <p className="mt-4 flex-1 text-sm leading-6 text-text-primary">
                {t(game.descriptionKey)}
              </p>
              <div className="mt-5 grid gap-2">
                <Link
                  href={game.computerHref}
                  className="inline-flex min-h-12 items-center justify-center rounded-md bg-action-primary px-4 text-sm font-bold text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                >
                  {t('action.playComputer')}
                </Link>
                <Link
                  href={game.onlineHref}
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary/30 bg-background-canvas px-4 text-sm font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                >
                  {t('landing.game.startFamilyRoom')}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <LandingFooter locale={locale} />
    </LandingShell>
  );
}
