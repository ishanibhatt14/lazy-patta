import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { createTranslator } from '../../../../lib/i18n';
import { LalSattiAccountPanel } from '../LalSattiAccountPanel';
import type { LalSattiRoundScore } from '../types';

interface LalSattiAccountSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly locale: Locale;
  readonly humanName: string;
  readonly playerCount: number;
  readonly roundScores: readonly LalSattiRoundScore[];
}

/**
 * A secondary sheet that lifts account sign-in and saved-score persistence out
 * of active gameplay. It simply hosts the unchanged account panel, so all auth
 * and persistence behavior is preserved. Escape and the scrim both close it.
 */
export function LalSattiAccountSheet({
  open,
  onClose,
  locale,
  humanName,
  playerCount,
  roundScores,
}: LalSattiAccountSheetProps): ReactElement | null {
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
        aria-labelledby="ls-account-title"
        className="ls-sheet relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface-primary p-5 shadow-md sm:h-full sm:max-h-none sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="ls-account-title" className="text-lg font-bold text-action-primary">
            {t('lalSatti.accountTitle')}
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

        <LalSattiAccountPanel
          locale={locale}
          humanName={humanName}
          playerCount={playerCount}
          roundScores={roundScores}
        />
      </div>
    </div>
  );
}
