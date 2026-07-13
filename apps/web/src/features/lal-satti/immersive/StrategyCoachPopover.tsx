import type { Locale, MessageKey } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../../lib/i18n';

interface StrategyCoachPopoverProps {
  readonly locale: Locale;
  readonly messageKey: MessageKey | null;
}

/**
 * A brief, friendly rule hint shown when the player taps a card that cannot be
 * placed yet. It is announced through a polite live region (not a second status
 * role, so the table keeps exactly one live turn status) and pairs with the
 * card's gentle shake — the explanation never depends on the animation.
 */
export function StrategyCoachPopover({
  locale,
  messageKey,
}: StrategyCoachPopoverProps): ReactElement {
  const { t } = createTranslator(locale);

  return (
    <div aria-live="polite" className="flex min-h-6 justify-center">
      {messageKey ? (
        <span className="rounded-full bg-background-canvas px-3 py-1 text-xs font-semibold text-action-primary shadow-md">
          {t(messageKey)}
        </span>
      ) : null}
    </div>
  );
}
