import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { buildRoster, HUMAN_ID } from '../../lib/computer-game/players';
import { MAX_TABLE_SIZE, MIN_TABLE_SIZE } from '../../lib/computer-game/rule-pack';
import type { ComputerGameViewState } from '../../lib/computer-game/types';
import { createTranslator } from '../../lib/i18n';
import { Button } from '../Button';

import { LocaleSwitcher } from './LocaleSwitcher';

interface ComputerGameSetupProps {
  readonly view: ComputerGameViewState;
  readonly onPlayerCountChange: (playerCount: number) => void;
  readonly onLocaleChange: (locale: Locale) => void;
  readonly onStart: () => void;
  readonly onHowToPlay: () => void;
}

const PLAYER_COUNTS: readonly number[] = Array.from(
  { length: MAX_TABLE_SIZE - MIN_TABLE_SIZE + 1 },
  (_, index) => MIN_TABLE_SIZE + index,
);

export function ComputerGameSetup({
  view,
  onPlayerCountChange,
  onLocaleChange,
  onStart,
  onHowToPlay,
}: ComputerGameSetupProps): ReactElement {
  const locale = view.settings.locale;
  const { t, format } = createTranslator(locale);
  const roster = buildRoster(view.settings.playerCount);
  const bots = roster.filter((entry) => entry.id !== HUMAN_ID);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-5 py-8 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">
          {t('computer.modeLabel')}
        </p>
        <LocaleSwitcher locale={locale} onLocaleChange={onLocaleChange} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold leading-tight text-action-primary md:text-6xl">
              {t('computer.setupTitle')}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-text-primary">
              {t('computer.setupDescription')}
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-lg bg-surface-primary p-5 shadow-md">
            <span className="text-sm font-semibold text-action-primary">
              {t('computer.playerCount')}
            </span>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={t('computer.playerCount')}
            >
              {PLAYER_COUNTS.map((count) => {
                const selected = view.settings.playerCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onPlayerCountChange(count)}
                    className={[
                      'min-h-12 min-w-12 rounded-md border text-base font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                      selected
                        ? 'border-action-primary bg-action-primary text-text-onBrand'
                        : 'border-action-primary bg-background-canvas text-action-primary',
                    ].join(' ')}
                    aria-pressed={selected}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg bg-surface-primary p-5 shadow-md">
            <span className="text-sm font-semibold text-action-primary">
              {t('computer.quickRulesTitle')}
            </span>
            <ul className="grid gap-2 text-sm leading-6 text-text-primary">
              <li>{t('computer.quickRulePairs')}</li>
              <li>{t('computer.quickRulePick')}</li>
              <li>{t('computer.quickRuleLast')}</li>
            </ul>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-lg bg-game-table p-5 text-text-onBrand shadow-md">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">{t('computer.botRoster')}</h2>
            <span className="rounded-md bg-action-secondary px-3 py-1 text-sm font-bold text-text-primary">
              {format('lobby.playerCount', { count: view.settings.playerCount })}
            </span>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-lg bg-surface-primary px-4 py-3 text-text-primary">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent text-lg font-bold text-text-onBrand">
                ★
              </span>
              <div className="flex flex-col">
                <span className="font-semibold">{t('computer.youName')}</span>
                <span className="text-sm">{t('computer.youSeat')}</span>
              </div>
            </div>

            {bots.map((bot) => (
              <div
                key={bot.id}
                className="flex items-center gap-3 rounded-lg bg-background-canvas px-4 py-3 text-text-primary"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-action-primary text-lg font-bold text-text-onBrand">
                  {bot.avatarInitial}
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold">{bot.name}</span>
                  <span className="text-sm">{t('computer.botSeat')}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex flex-col gap-2">
            <Button size="lg" className="w-full min-h-12" onClick={onStart}>
              {t('computer.startGame')}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="w-full min-h-12 bg-surface-primary"
              onClick={onHowToPlay}
            >
              {t('action.howToPlay')}
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
