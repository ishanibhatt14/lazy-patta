'use client';

import { DEFAULT_LOCALE } from '@lazy-patta/localization';
import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { Button } from '../Button';

/**
 * Resilient replacement for the old bare "Checking your session…" line. It
 * announces progress through a polite live region and, if the session check
 * stalls past {@link SLOW_THRESHOLD_MS}, escalates to an assertive alert with
 * concrete recovery paths (retry, back to games) so the online entry is never a
 * silent dead end.
 */

const t = createTranslator(DEFAULT_LOCALE);

const SLOW_THRESHOLD_MS = 6000;

export function SessionLoadingState(): ReactElement {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-lg bg-surface-primary p-6 text-center shadow-sm">
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
        <span
          aria-hidden
          className="h-6 w-6 animate-spin rounded-full border-2 border-action-primary/30 border-t-action-primary motion-reduce:animate-none"
        />
        <p className="text-sm font-semibold text-text-primary">{t.t('auth.loading')}</p>
        <p className="text-xs text-text-primary/80">{t.t('auth.loadingHint')}</p>
      </div>

      {slow ? (
        <div role="alert" className="flex w-full flex-col gap-3">
          <p className="text-sm text-status-error">{t.t('auth.loadingSlow')}</p>
          <Button onClick={() => window.location.reload()}>{t.t('action.tryAgain')}</Button>
          <Link
            href="/#games"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary px-5 font-semibold text-action-primary transition hover:bg-action-primary hover:text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t.t('action.backToGames')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
