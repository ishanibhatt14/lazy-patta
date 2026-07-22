import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';

/**
 * Neutral "starting" panel shown for the single frame between mount and the
 * `autoStart` effect dispatching `start`. Every computer game renders this same
 * placeholder instead of its (legacy) setup surface when launched from the
 * shared mobile setup shell, so the four games look identical while the table
 * is dealt — no game ever flashes its own older setup screen.
 */
export function ComputerGameStarting({ locale }: { readonly locale: Locale }): ReactElement {
  const t = createTranslator(locale);
  return (
    <main className="grid min-h-[calc(100dvh-7rem)] place-items-center text-center">
      <p role="status" className="rounded-2xl bg-surface-primary p-5 text-sm text-text-primary">
        {t.t('rooms.starting')}
      </p>
    </main>
  );
}
