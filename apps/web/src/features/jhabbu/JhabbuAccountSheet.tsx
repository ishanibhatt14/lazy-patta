import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { createTranslator } from '../../../lib/i18n';

import { JhabbuAccountPanel } from './JhabbuAccountPanel';
import type { JhabbuRoundScore } from './types';

interface JhabbuAccountSheetProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly locale: Locale;
  readonly humanName: string;
  readonly playerCount: number;
  readonly roundScores: readonly JhabbuRoundScore[];
}

/**
 * A secondary sheet that lifts account sign-in and saved-score persistence out
 * of active gameplay. It hosts the unchanged Jhabbu account panel, mirroring the
 * Lal Satti account sheet. Escape and the scrim both close it.
 */
export function JhabbuAccountSheet({
  open,
  onClose,
  locale,
  humanName,
  playerCount,
  roundScores,
}: JhabbuAccountSheetProps): ReactElement | null {
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
    <div className="jh-sheet-wrap">
      <button
        type="button"
        className="jh-sheet-scrim"
        aria-label={t('action.close')}
        onClick={onClose}
      />
      <section
        className="jh-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jh-account-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="jh-account-title" className="text-lg font-black text-action-primary">
            {t('jhabbu.accountTitle')}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="jh-icon-button"
            onClick={onClose}
            aria-label={t('action.close')}
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="mt-4">
          <JhabbuAccountPanel
            locale={locale}
            humanName={humanName}
            playerCount={playerCount}
            roundScores={roundScores}
          />
        </div>
      </section>
    </div>
  );
}
