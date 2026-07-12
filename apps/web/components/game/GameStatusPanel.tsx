import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import type { ComputerGameViewEvent, ComputerGameViewState } from '../../lib/computer-game/types';
import { createTranslator } from '../../lib/i18n';

import { LocaleSwitcher } from './LocaleSwitcher';

interface GameStatusPanelProps {
  readonly view: ComputerGameViewState;
  readonly locale: Locale;
  readonly onToggleSound: () => void;
  readonly onToggleReducedMotion: () => void;
  readonly onLocaleChange: (locale: Locale) => void;
  readonly onHowToPlay: () => void;
}

export function GameStatusPanel({
  view,
  locale,
  onToggleSound,
  onToggleReducedMotion,
  onLocaleChange,
  onHowToPlay,
}: GameStatusPanelProps): ReactElement {
  const { t, format } = createTranslator(locale);
  const { soundEnabled, reducedMotion } = view.settings;

  const eventLabel = (event: ComputerGameViewEvent): string =>
    format(event.messageKey, event.values ?? {});

  return (
    <aside className="flex flex-col gap-4 rounded-lg bg-surface-primary p-4 shadow-md lg:min-w-72">
      <div>
        <h2 className="text-lg font-bold text-action-primary">{t('computer.tablePanelTitle')}</h2>
        <p className="text-sm text-text-primary">{t('computer.tablePanelSubtitle')}</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-action-primary">{t('settings.language')}</span>
        <LocaleSwitcher locale={locale} onLocaleChange={onLocaleChange} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onToggleSound}
          className="min-h-12 rounded-md border border-action-primary bg-background-canvas px-3 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? t('settings.soundOn') : t('settings.soundOff')}
        </button>
        <button
          type="button"
          onClick={onToggleReducedMotion}
          className="min-h-12 rounded-md border border-action-primary bg-background-canvas px-3 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          aria-pressed={reducedMotion}
        >
          {t('settings.reducedMotion')}
        </button>
      </div>

      <button
        type="button"
        onClick={onHowToPlay}
        className="min-h-12 rounded-md border border-action-primary bg-background-canvas px-3 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      >
        {t('action.howToPlay')}
      </button>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-action-primary">{t('computer.eventLog')}</span>
        <div className="grid gap-2" aria-live="polite">
          {view.events.length === 0 ? (
            <p className="rounded-md bg-background-canvas px-3 py-2 text-sm text-text-primary">
              {t('computer.eventReady')}
            </p>
          ) : (
            view.events.map((event) => (
              <p
                key={event.id}
                className="rounded-md bg-background-canvas px-3 py-2 text-sm text-text-primary"
              >
                {eventLabel(event)}
              </p>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
