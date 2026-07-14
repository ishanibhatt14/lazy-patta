import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { LocaleSwitcher } from '../../../../components/game/LocaleSwitcher';
import { createTranslator } from '../../../../lib/i18n';

interface SettingsSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly locale: Locale;
  readonly reducedMotion: boolean;
  readonly largeCards: boolean;
  readonly highContrast: boolean;
  readonly onToggleReducedMotion: () => void;
  readonly onToggleLargeCards: () => void;
  readonly onToggleHighContrast: () => void;
  readonly onLocaleChange: (locale: Locale) => void;
  readonly onOpenHistory: () => void;
  readonly onOpenAccount: () => void;
}

const TOGGLE_CLASS =
  'min-h-12 rounded-md border border-action-primary bg-background-canvas px-3 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent';

/**
 * Table settings on demand — a bottom sheet on mobile, a right-anchored panel on
 * wider screens. Holds language, accessibility toggles (reduced motion, large
 * cards, high-contrast cards), a quick rules recap, and links to the game
 * history and account sheets. Escape and the scrim both close it.
 */
export function SettingsSheet({
  open,
  onClose,
  locale,
  reducedMotion,
  largeCards,
  highContrast,
  onToggleReducedMotion,
  onToggleLargeCards,
  onToggleHighContrast,
  onLocaleChange,
  onOpenHistory,
  onOpenAccount,
}: SettingsSheetProps): ReactElement | null {
  const { t } = createTranslator(locale);
  const closeRef = useRef<HTMLButtonElement>(null);

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
        aria-labelledby="ls-settings-title"
        className="ls-sheet relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface-primary p-5 shadow-md sm:h-full sm:max-h-none sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="ls-settings-title" className="text-lg font-bold text-action-primary">
            {t('lalSatti.settingsTitle')}
          </h2>
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
            onClick={onToggleReducedMotion}
            className={TOGGLE_CLASS}
            aria-pressed={reducedMotion}
          >
            {t('settings.reducedMotion')}
          </button>
          <button
            type="button"
            onClick={onToggleLargeCards}
            className={`${TOGGLE_CLASS} flex flex-col items-start justify-center py-2 text-left`}
            aria-pressed={largeCards}
          >
            <span className="block">{t('settings.largeCards')}</span>
            <span className="mt-1 block text-xs font-medium leading-5 text-text-primary">
              {t('settings.largeCardsHint')}
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleHighContrast}
            className={TOGGLE_CLASS}
            aria-pressed={highContrast}
          >
            {t('lalSatti.highContrastCards')}
          </button>
          <button type="button" onClick={onOpenHistory} className={TOGGLE_CLASS}>
            {t('lalSatti.gameHistoryTitle')}
          </button>
        </div>

        <button type="button" onClick={onOpenAccount} className={`${TOGGLE_CLASS} text-left`}>
          <span className="block">{t('lalSatti.accountOptionalTitle')}</span>
          <span className="mt-1 block text-xs font-medium leading-5 text-text-primary">
            {t('lalSatti.accountOptionalHelp')}
          </span>
        </button>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-action-primary">
            {t('lalSatti.quickRulesTitle')}
          </span>
          <ul className="list-disc space-y-1.5 rounded-md bg-background-canvas px-5 py-3 text-sm leading-6 text-text-primary">
            <li>{t('lalSatti.quickRuleSevens')}</li>
            <li>{t('lalSatti.quickRuleBuild')}</li>
            <li>{t('lalSatti.quickRulePass')}</li>
            <li>{t('lalSatti.quickRuleScoring')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
