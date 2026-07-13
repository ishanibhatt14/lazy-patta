import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import type {
  ComputerGameViewEvent,
  ComputerGameViewState,
} from '../../../lib/computer-game/types';
import { createTranslator } from '../../../lib/i18n';
import { LocaleSwitcher } from '../LocaleSwitcher';

interface GameSettingsSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly view: ComputerGameViewState;
  readonly locale: Locale;
  readonly onToggleSound: () => void;
  readonly onToggleReducedMotion: () => void;
  readonly onLocaleChange: (locale: Locale) => void;
  readonly onHowToPlay: () => void;
  readonly largeCards: boolean;
  readonly onToggleLargeCards: () => void;
}

const TOGGLE_CLASS =
  'min-h-12 rounded-md border border-action-primary bg-background-canvas px-3 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent';

/**
 * The table settings, on demand. A bottom sheet on mobile and a right-anchored
 * panel on wider screens — replacing the permanent status sidebar. Holds
 * language, sound, motion, large-card accessibility, how-to-play, and the
 * round-updates log. Escape and the scrim both close it.
 */
export function GameSettingsSheet({
  open,
  onClose,
  view,
  locale,
  onToggleSound,
  onToggleReducedMotion,
  onLocaleChange,
  onHowToPlay,
  largeCards,
  onToggleLargeCards,
}: GameSettingsSheetProps): ReactElement | null {
  const { t, format } = createTranslator(locale);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { soundEnabled, reducedMotion } = view.settings;

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const eventLabel = (event: ComputerGameViewEvent): string =>
    format(event.messageKey, event.values ?? {});

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button
        type="button"
        aria-label={t('action.close')}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gc-settings-title"
        className="relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface-primary p-5 shadow-md sm:h-full sm:max-h-none sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="gc-settings-title" className="text-lg font-bold text-action-primary">
              {t('computer.tablePanelTitle')}
            </h2>
            <p className="text-sm text-text-primary">{t('computer.tablePanelSubtitle')}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('action.close')}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-md border border-action-primary text-lg font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-action-primary">
            {t('settings.language')}
          </span>
          <LocaleSwitcher locale={locale} onLocaleChange={onLocaleChange} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            className={TOGGLE_CLASS}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? t('settings.soundOn') : t('settings.soundOff')}
          </button>
          <button
            type="button"
            onClick={onToggleReducedMotion}
            className={TOGGLE_CLASS}
            aria-pressed={reducedMotion}
          >
            {t('settings.reducedMotion')}
          </button>
          <button
            type="button"
            onClick={onToggleLargeCards}
            className={TOGGLE_CLASS}
            aria-pressed={largeCards}
          >
            {t('settings.largeCards')}
          </button>
          <button type="button" onClick={onHowToPlay} className={TOGGLE_CLASS}>
            {t('action.howToPlay')}
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-action-primary">
            {t('computer.eventLog')}
          </span>
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
      </div>
    </div>
  );
}
