'use client';

import Link from 'next/link';
import { useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import type { TutorialStep } from '../game/HowToPlayTutorial';
import { HowToPlayTutorial } from '../game/HowToPlayTutorial';

import { GameCard } from './GameCard';

export interface GameOverviewProps {
  readonly nameKey: 'games.lalSatti.name' | 'games.gadhaChor.name';
  readonly descriptionKey: 'games.lalSatti.description' | 'games.gadhaChor.description';
  readonly status: 'available' | 'comingSoon';
  readonly computerHref: string;
  readonly onlineHref?: string;
  readonly tutorialSteps: readonly TutorialStep[];
}

/**
 * A single game's `/games/<game>` overview — deliberately thin per the lobby
 * redesign brief ("not a long marketing page yet"): the same card content as
 * the home lobby, just linkable/bookmarkable on its own, plus a way back.
 */
export function GameOverview({
  nameKey,
  descriptionKey,
  status,
  computerHref,
  onlineHref,
  tutorialSteps,
}: GameOverviewProps): ReactElement {
  const { locale } = usePreferredLocale();
  const { t } = createTranslator(locale);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-12">
      <Link href="/" className="text-sm font-semibold text-action-primary hover:underline">
        ← {t('lobby.backToGames')}
      </Link>

      <GameCard
        locale={locale}
        name={t(nameKey)}
        description={t(descriptionKey)}
        status={status}
        computerHref={computerHref}
        onlineHref={onlineHref}
        onHowToPlay={() => setTutorialOpen(true)}
      />

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
