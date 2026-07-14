'use client';

import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import { useState, type ReactElement } from 'react';

import {
  GAME_DISCOVERY,
  GAME_SLUGS,
  localizedGamePath,
  type GameDiscoveryConfig,
} from '../../lib/game-discovery';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { rulesPath } from '../../lib/seo/routes';
import type { TutorialStep } from '../game/HowToPlayTutorial';
import { HowToPlayTutorial } from '../game/HowToPlayTutorial';

import { GameCard } from './GameCard';

export interface GameOverviewProps {
  readonly game: GameDiscoveryConfig;
  readonly localeOverride?: Locale;
  readonly status: 'available' | 'comingSoon';
  readonly tutorialSteps: readonly TutorialStep[];
}

/**
 * A single game's `/games/<game>` overview — deliberately thin per the lobby
 * redesign brief ("not a long marketing page yet"): the same card content as
 * the home lobby, just linkable/bookmarkable on its own, plus a way back.
 */
export function GameOverview({
  game,
  localeOverride,
  status,
  tutorialSteps,
}: GameOverviewProps): ReactElement {
  const preferredLocale = usePreferredLocale();
  const locale = localeOverride ?? preferredLocale.locale;
  const { t } = createTranslator(locale);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const relatedSlug = GAME_SLUGS.find((slug) => slug !== game.slug);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <Link href="/" className="text-sm font-semibold text-action-primary hover:underline">
        ← {t('lobby.backToGames')}
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black leading-tight text-action-primary">
          {t(game.pageHeadingKey)}
        </h1>
        <p className="text-base leading-7 text-text-primary">{t(game.detailIntroKey)}</p>
      </div>

      <GameCard
        locale={locale}
        name={t(game.nameKey)}
        alias={t(game.aliasShortKey)}
        description={t(game.descriptionKey)}
        status={status}
        computerHref={game.computerHref}
        onlineHref={game.onlineHref}
        onHowToPlay={() => setTutorialOpen(true)}
      />

      <section className="rounded-lg bg-surface-primary p-6 shadow-sm">
        <dl className="grid gap-3 text-sm text-text-primary sm:grid-cols-3">
          <div className="rounded-md bg-background-canvas p-3">
            <dt className="font-bold text-action-primary">{t('games.detail.alsoKnownAs')}</dt>
            <dd className="mt-1 leading-6">{t(game.aliasesKey)}</dd>
          </div>
          <div className="rounded-md bg-background-canvas p-3">
            <dt className="font-bold text-action-primary">{t('games.detail.hindiName')}</dt>
            <dd className="mt-1 leading-6">{t(game.hindiNameKey)}</dd>
          </div>
          <div className="rounded-md bg-background-canvas p-3">
            <dt className="font-bold text-action-primary">{t('games.detail.gujaratiName')}</dt>
            <dd className="mt-1 leading-6">{t(game.gujaratiNameKey)}</dd>
          </div>
        </dl>

        <details className="mt-5 rounded-md border border-action-primary/20 bg-background-canvas p-4">
          <summary className="cursor-pointer text-sm font-bold text-action-primary">
            {t('games.detail.otherNames')}
          </summary>
          <p className="mt-3 text-sm leading-6 text-text-primary">{t(game.otherNamesSummaryKey)}</p>
        </details>
      </section>

      <section className="grid gap-4">
        {game.sections.map((section) => (
          <article key={section.titleKey} className="rounded-lg bg-surface-primary p-5 shadow-sm">
            <h2 className="text-xl font-black text-action-primary">{t(section.titleKey)}</h2>
            <p className="mt-2 text-sm leading-6 text-text-primary">{t(section.bodyKey)}</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-lg bg-surface-primary p-6 shadow-sm">
        <Link
          href={rulesPath(locale, game.slug)}
          className="inline-flex w-fit items-center gap-2 rounded-md bg-action-primary px-4 py-2 text-sm font-bold text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t('seo.cta.readRules')} →
        </Link>

        {relatedSlug ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-black text-action-primary">{t('seo.related.heading')}</h2>
            <Link
              href={localizedGamePath(locale, relatedSlug)}
              className="w-fit text-sm font-semibold text-action-primary hover:underline"
            >
              {t(GAME_DISCOVERY[relatedSlug].nameKey)} →
            </Link>
          </div>
        ) : null}
      </section>

      {tutorialOpen ? (
        <HowToPlayTutorial
          locale={locale}
          steps={tutorialSteps}
          onClose={() => setTutorialOpen(false)}
        />
      ) : null}
    </main>
  );
}
