'use client';

import { DEFAULT_LOCALE, type Locale } from '@lazy-patta/localization';
import Image from 'next/image';
import { useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { GADHA_CHOR_TUTORIAL_STEPS, HowToPlayTutorial } from '../game/HowToPlayTutorial';
import { LocaleSwitcher } from '../game/LocaleSwitcher';
import { LAL_SATTI_TUTORIAL_STEPS } from '../game/lal-satti-tutorial-steps';

import { GameCard } from './GameCard';

type ActiveTutorial = 'gadha-chor' | 'lal-satti' | null;

/**
 * Lazy Patta's landing lobby (recommended-home-page redesign): logo + tagline,
 * a language switcher (lobby copy only — each game keeps its own in-game
 * switcher for now), the two game cards, and a small "more games" teaser. This
 * is the front door for the whole collection, not just Gadha Chor.
 */
export function GameLobby(): ReactElement {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [activeTutorial, setActiveTutorial] = useState<ActiveTutorial>(null);
  const { t } = createTranslator(locale);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-10 px-6 py-12">
      <header className="flex flex-col items-center gap-4 text-center">
        <Image
          src="/images/lazy-patta-logo-transparent.png"
          alt={t('brand.logoAlt')}
          width={280}
          height={280}
          priority
          className="h-auto w-48 sm:w-60"
        />
        <h1 className="sr-only">{t('app.name')}</h1>
        <p className="text-lg text-text-primary">{t('welcome.tagline')}</p>
        <LocaleSwitcher locale={locale} onLocaleChange={setLocale} />
      </header>

      <section className="flex w-full flex-col gap-4">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-text-primary/70">
          {t('lobby.chooseGame')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <GameCard
            locale={locale}
            name={t('games.lalSatti.name')}
            description={t('games.lalSatti.description')}
            status="available"
            computerHref="/play/lal-satti/computer"
            overviewHref="/games/lal-satti"
            onHowToPlay={() => setActiveTutorial('lal-satti')}
          />
          <GameCard
            locale={locale}
            name={t('games.gadhaChor.name')}
            description={t('games.gadhaChor.description')}
            status="available"
            computerHref="/play/gadha-chor/computer"
            onlineHref="/play/gadha-chor/online"
            overviewHref="/games/gadha-chor"
            onHowToPlay={() => setActiveTutorial('gadha-chor')}
          />
        </div>
      </section>

      <section className="flex w-full flex-col items-center gap-1 rounded-md bg-surface-primary px-4 py-3 text-center text-sm text-text-primary shadow-sm">
        <span className="font-semibold">{t('lobby.moreGamesTitle')}</span>
        <span>{t('lobby.moreGamesBody')}</span>
      </section>

      <p className="rounded-md bg-surface-primary px-4 py-2 text-sm text-text-primary shadow-sm">
        {t('welcome.noBetting')}
      </p>

      {activeTutorial === 'gadha-chor' ? (
        <HowToPlayTutorial
          locale={locale}
          steps={GADHA_CHOR_TUTORIAL_STEPS}
          onClose={() => setActiveTutorial(null)}
        />
      ) : null}
      {activeTutorial === 'lal-satti' ? (
        <HowToPlayTutorial
          locale={locale}
          steps={LAL_SATTI_TUTORIAL_STEPS}
          onClose={() => setActiveTutorial(null)}
        />
      ) : null}
    </main>
  );
}
