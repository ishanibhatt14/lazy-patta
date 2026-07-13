import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { createTranslator } from '../../../../lib/i18n';
import type { LalSattiViewEvent } from '../types';

interface GameHistoryDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly locale: Locale;
  readonly events: readonly LalSattiViewEvent[];
}

/**
 * The optional running play-by-play. A bottom sheet on mobile, a right-anchored
 * panel on wider screens, opened from settings. The same beats are announced
 * live through the table status region, so this drawer is a passive review view.
 */
export function GameHistoryDrawer({
  open,
  onClose,
  locale,
  events,
}: GameHistoryDrawerProps): ReactElement | null {
  const { t, format } = createTranslator(locale);
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
        aria-labelledby="ls-history-title"
        className="ls-sheet relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface-primary p-5 shadow-md sm:h-full sm:max-h-none sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="ls-history-title" className="text-lg font-bold text-action-primary">
            {t('lalSatti.gameHistoryTitle')}
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

        <div className="grid gap-2">
          {events.length === 0 ? (
            <p className="rounded-md bg-background-canvas px-3 py-2 text-sm text-text-primary">
              {t('computer.eventReady')}
            </p>
          ) : (
            events.map((event) => (
              <p
                key={event.id}
                className="rounded-md bg-background-canvas px-3 py-2 text-sm text-text-primary"
              >
                {format(event.messageKey, event.values ?? {})}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
