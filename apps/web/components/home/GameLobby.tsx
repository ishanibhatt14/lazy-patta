'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { GADHA_CHOR_TUTORIAL_STEPS, HowToPlayTutorial } from '../game/HowToPlayTutorial';
import { LAL_SATTI_TUTORIAL_STEPS } from '../game/lal-satti-tutorial-steps';

import { AnimatedHero } from './landing/AnimatedHero';
import { ComingGamesRail } from './landing/ComingGamesRail';
import { FamilyConnectionSection } from './landing/FamilyConnectionSection';
import { FounderStorySection } from './landing/FounderStorySection';
import { LandingFooter } from './landing/LandingFooter';
import { LandingShell } from './landing/LandingShell';
import { PlayModeSection } from './landing/PlayModeSection';
import { GadhaChorArtwork, LalSattiArtwork, RichGameCard } from './landing/RichGameCard';

type ActiveTutorial = 'gadha-chor' | 'lal-satti' | null;

export function GameLobby(): ReactElement {
  const { locale } = usePreferredLocale();
  const [activeTutorial, setActiveTutorial] = useState<ActiveTutorial>(null);
  const { t } = createTranslator(locale);

  return (
    <LandingShell>
      <AnimatedHero locale={locale} />

      <section
        className="mx-auto w-full max-w-7xl px-5 pb-10 pt-8 md:px-8 md:pb-12 md:pt-12"
        id="games"
        aria-labelledby="landing-games-title"
      >
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
            {t('landing.games.eyebrow')}
          </p>
          <h2
            id="landing-games-title"
            className="text-3xl font-black text-action-primary md:text-5xl"
          >
            {t('landing.games.title')}
          </h2>
          <p className="max-w-2xl text-base leading-7 text-text-primary">
            {t('landing.games.body')}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RichGameCard
            locale={locale}
            title={t('games.gadhaChor.name')}
            alias={t('games.gadhaChor.aliasShort')}
            description={t('landing.game.gadhaChor.description')}
            status={t('games.status.available')}
            difficulty={t('landing.game.gadhaChor.difficulty')}
            duration={t('landing.game.gadhaChor.duration')}
            players={t('landing.game.gadhaChor.players')}
            computerHref="/play/gadha-chor/computer"
            onlineHref="/play/online?game=gadha_chor"
            overviewHref="/games/gadha-chor"
            onHowToPlay={() => setActiveTutorial('gadha-chor')}
            artwork={<GadhaChorArtwork />}
          />
          <RichGameCard
            locale={locale}
            title={t('games.lalSatti.name')}
            alias={t('games.lalSatti.aliasShort')}
            description={t('landing.game.lalSatti.description')}
            status={t('games.status.available')}
            difficulty={t('landing.game.lalSatti.difficulty')}
            duration={t('landing.game.lalSatti.duration')}
            players={t('landing.game.lalSatti.players')}
            computerHref="/play/lal-satti/computer"
            onlineHref="/play/online?game=lal_satti"
            overviewHref="/games/lal-satti"
            onHowToPlay={() => setActiveTutorial('lal-satti')}
            artwork={<LalSattiArtwork />}
          />
        </div>
      </section>

      <PlayModeSection locale={locale} />
      <FamilyConnectionSection locale={locale} />
      <FounderStorySection locale={locale} />
      <ComingGamesRail locale={locale} />
      <LandingFooter locale={locale} />

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
    </LandingShell>
  );
}
