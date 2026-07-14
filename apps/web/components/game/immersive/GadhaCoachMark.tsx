import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

interface GadhaCoachMarkProps {
  readonly locale: Locale;
  readonly onDismiss: () => void;
}

/**
 * A one-time first-turn hint that points to the eligible hidden hand and
 * explains the single-tap draw. It sits above the fan (never covering the
 * cards), announces itself politely to screen readers, and is dismissed either
 * by "Got it" or automatically once the human completes their first draw. Its
 * guidance is also replayable any time through How to Play. Entrance motion is
 * held at rest under reduced-motion via the shell's `data-reduced-motion` flag.
 */
export function GadhaCoachMark({ locale, onDismiss }: GadhaCoachMarkProps): ReactElement {
  const { t } = createTranslator(locale);
  return (
    <div
      className="gc-coach flex max-w-xs flex-col items-center gap-1 rounded-2xl px-4 py-3 text-center"
      role="note"
      aria-live="polite"
    >
      <span aria-hidden className="gc-coach-arrow text-lg leading-none">
        ▾
      </span>
      <span className="text-sm font-bold text-text-onBrand">{t('computer.coachTitle')}</span>
      <span className="text-xs font-medium leading-5 text-text-onBrand">
        {t('computer.coachBody')}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-1 min-h-8 rounded-full bg-background-canvas px-3 py-1 text-xs font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      >
        {t('computer.coachDismiss')}
      </button>
    </div>
  );
}
