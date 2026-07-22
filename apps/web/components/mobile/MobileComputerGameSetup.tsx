'use client';

import type { BotDifficulty } from '@lazy-patta/game-contracts';
import Link from 'next/link';
import type { ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import type { ComputerGameConfig } from '../../lib/mobile/computer-session';
import {
  type GameDefinition,
  type GameSlug,
  isValidPlayerCount,
} from '../../lib/mobile/game-registry';
import { Button } from '../Button';
import { LandingLanguageMenu } from '../home/landing/LandingLanguageMenu';

const DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABEL_KEY: Record<
  BotDifficulty,
  'computer.difficultyEasy' | 'computer.difficultyMedium' | 'computer.difficultyHard'
> = {
  easy: 'computer.difficultyEasy',
  medium: 'computer.difficultyMedium',
  hard: 'computer.difficultyHard',
};

function playerCounts(game: GameDefinition): readonly number[] {
  return Array.from(
    { length: game.players.max - game.players.min + 1 },
    (_, index) => game.players.min + index,
  );
}

export function defaultComputerConfig(game: GameDefinition): ComputerGameConfig {
  return {
    gameSlug: game.slug,
    humanName: '',
    playerCount: game.players.defaultComputer,
    difficulty: game.computerOptions.defaultDifficulty,
    reducedMotion: false,
    confirmBeforePlay: false,
  };
}

export function MobileComputerGameSetup({
  game,
  config,
  t,
  busy,
  onChange,
  onStart,
  onBack,
}: {
  readonly game: GameDefinition;
  readonly config: ComputerGameConfig;
  readonly t: Translator;
  readonly busy: boolean;
  readonly onChange: (config: ComputerGameConfig) => void;
  readonly onStart: () => void;
  readonly onBack: () => void;
}): ReactElement {
  const valid = config.gameSlug === game.slug && isValidPlayerCount(game, config.playerCount);
  const title = t.format('mobile.setup.title', { name: t.t(game.localization.nameKey) });

  return (
    <main className="flex min-h-[calc(100dvh-7rem)] flex-col justify-between gap-5">
      <section className="flex flex-col gap-5 rounded-2xl border border-action-primary/15 bg-surface-primary px-4 py-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-black uppercase tracking-wide text-brand-accent">
              {t.t('action.playComputer')}
            </p>
            <h1 className="text-2xl font-black leading-tight text-action-primary">{title}</h1>
          </div>
          <LandingLanguageMenu />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-6 text-text-primary/85">
            {t.t(game.localization.descriptionKey)}
          </p>
        </div>

        <div className="grid gap-5">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-black text-action-primary">
              {t.t('computer.playerCount')}
            </legend>
            <div className="grid grid-cols-5 gap-2" role="group">
              {playerCounts(game).map((count) => (
                <button
                  key={count}
                  type="button"
                  aria-pressed={config.playerCount === count}
                  className={[
                    'min-h-12 rounded-xl border text-base font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                    config.playerCount === count
                      ? 'border-action-primary bg-action-primary text-text-onBrand'
                      : 'border-action-primary/25 bg-background-canvas text-action-primary',
                  ].join(' ')}
                  onClick={() => onChange({ ...config, playerCount: count })}
                >
                  {count}
                </button>
              ))}
            </div>
          </fieldset>

          {game.computerOptions.supportsDifficulty ? (
            <fieldset className="grid gap-2">
              <legend className="text-sm font-black text-action-primary">
                {t.t('computer.difficultyLabel')}
              </legend>
              <div className="grid grid-cols-3 gap-2" role="group">
                {DIFFICULTIES.map((difficulty) => (
                  <button
                    key={difficulty}
                    type="button"
                    aria-pressed={config.difficulty === difficulty}
                    className={[
                      'min-h-12 rounded-xl border px-2 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                      config.difficulty === difficulty
                        ? 'border-action-primary bg-action-primary text-text-onBrand'
                        : 'border-action-primary/25 bg-background-canvas text-action-primary',
                    ].join(' ')}
                    onClick={() => onChange({ ...config, difficulty })}
                  >
                    {t.t(DIFFICULTY_LABEL_KEY[difficulty])}
                  </button>
                ))}
              </div>
              <p className="text-xs leading-5 text-text-primary/75">
                {t.t('computer.difficultyHelp')}
              </p>
            </fieldset>
          ) : null}
        </div>
      </section>

      <nav className="grid gap-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <Button size="lg" className="min-h-14 w-full" disabled={busy || !valid} onClick={onStart}>
          {busy ? t.t('rooms.starting') : t.t('computer.startGame')}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="min-h-12" onClick={onBack} disabled={busy}>
            {t.t('action.backToGames')}
          </Button>
          <Link
            href={game.routes.rules}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary px-4 py-2.5 text-base font-semibold text-action-primary transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t.t('action.howToPlay')}
          </Link>
        </div>
      </nav>
    </main>
  );
}

export function setupRouteFor(slug: GameSlug): string {
  return `/mobile/game/${slug}/setup?mode=computer`;
}
