import { DEFAULT_LOCALE, formatMessage, getMessages } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { botPreview } from '../../lib/computer-game/fixture-adapter';
import type { ComputerGameViewState } from '../../lib/computer-game/types';
import { Button } from '../Button';

const t = getMessages(DEFAULT_LOCALE);

interface ComputerGameSetupProps {
  readonly state: ComputerGameViewState;
  readonly onPlayerCountChange: (playerCount: number) => void;
  readonly onStart: () => void;
}

export function ComputerGameSetup({
  state,
  onPlayerCountChange,
  onStart,
}: ComputerGameSetupProps): ReactElement {
  const bots = botPreview(state.settings.playerCount);

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-5 py-8 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent">
              {t['computer.modeLabel']}
            </p>
            <h1 className="text-4xl font-bold leading-tight text-action-primary md:text-6xl">
              {t['computer.setupTitle']}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-text-primary">
              {t['computer.setupDescription']}
            </p>
          </div>

          <div className="grid gap-4 rounded-lg bg-surface-primary p-5 shadow-md md:grid-cols-3">
            <div className="flex flex-col gap-2 md:col-span-1">
              <span className="text-sm font-semibold text-action-primary">
                {t['computer.playerCount']}
              </span>
              <div className="flex gap-2" role="group" aria-label={t['computer.playerCount']}>
                {[3, 4, 5].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onPlayerCountChange(count)}
                    className={[
                      'min-h-12 min-w-12 rounded-md border text-base font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                      state.settings.playerCount === count
                        ? 'border-action-primary bg-action-primary text-text-onBrand'
                        : 'border-action-primary bg-background-canvas text-action-primary',
                    ].join(' ')}
                    aria-pressed={state.settings.playerCount === count}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-semibold text-action-primary">
                {t['computer.quickRulesTitle']}
              </span>
              <ul className="grid gap-2 text-sm leading-6 text-text-primary">
                <li>{t['computer.quickRulePairs']}</li>
                <li>{t['computer.quickRulePick']}</li>
                <li>{t['computer.quickRuleLast']}</li>
              </ul>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-lg bg-game-table p-5 text-text-onBrand shadow-md">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">{t['computer.botRoster']}</h2>
            <span className="rounded-md bg-action-secondary px-3 py-1 text-sm font-bold text-text-primary">
              {formatMessage(DEFAULT_LOCALE, 'lobby.playerCount', {
                count: state.settings.playerCount,
              })}
            </span>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 rounded-lg bg-surface-primary px-4 py-3 text-text-primary">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent text-lg font-bold text-text-onBrand">
                I
              </span>
              <div className="flex flex-col">
                <span className="font-semibold">Ishani</span>
                <span className="text-sm">{t['computer.youSeat']}</span>
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
                  <span className="text-sm">{t['computer.botSeat']}</span>
                </div>
              </div>
            ))}
          </div>

          <Button size="lg" className="mt-2 w-full min-h-12" onClick={onStart}>
            {t['computer.startGame']}
          </Button>
        </aside>
      </div>
    </section>
  );
}
