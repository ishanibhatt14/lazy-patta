import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { Button } from '../../../../components/Button';
import { createTranslator } from '../../../../lib/i18n';

interface PassPromptProps {
  readonly locale: Locale;
  readonly isHumanTurn: boolean;
  readonly canPass: boolean;
  readonly playableCount: number;
  readonly onPass: () => void;
}

/**
 * The turn-action prompt anchored above the hand. A Pass button appears only
 * when the engine offers no legal card (blocked). When legal moves exist it
 * shows how many cards are playable and offers no pass — pass is never a
 * discretionary choice.
 */
export function PassPrompt({
  locale,
  isHumanTurn,
  canPass,
  playableCount,
  onPass,
}: PassPromptProps): ReactElement | null {
  const { t, format } = createTranslator(locale);

  if (!isHumanTurn) return null;

  if (playableCount > 0) {
    return (
      <span className="rounded-full bg-[color-mix(in_srgb,var(--lp-background-canvas)_85%,transparent)] px-3 py-1 text-xs font-bold text-action-primary">
        {format('lalSatti.playableCount', { count: playableCount })}
      </span>
    );
  }

  if (!canPass) return null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="rounded-full bg-[color-mix(in_srgb,var(--lp-background-canvas)_85%,transparent)] px-3 py-1 text-xs font-bold text-action-primary">
        {t('lalSatti.blockedNoCard')}
      </span>
      <Button size="sm" variant="secondary" onClick={onPass}>
        {t('lalSatti.passTurn')}
      </Button>
    </div>
  );
}
