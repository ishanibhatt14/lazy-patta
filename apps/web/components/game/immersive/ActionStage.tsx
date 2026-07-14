import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import type { ComputerGameViewState } from '../../../lib/computer-game/types';
import { createTranslator } from '../../../lib/i18n';

import { DrawAnimationLayer } from './DrawAnimationLayer';
import { GadhaCoachMark } from './GadhaCoachMark';
import { OpponentDrawFan } from './OpponentDrawFan';
import { PairDiscardPile } from './PairDiscardPile';

interface ActionStageProps {
  readonly locale: Locale;
  readonly view: ComputerGameViewState;
  readonly onChooseCard: (positionToken: string) => void;
  /** First-turn coach mark pointing at the eligible hidden hand. */
  readonly showCoachMark: boolean;
  readonly onDismissCoachMark: () => void;
}

/**
 * The heart of the table: the eligible-card fan, the central pair pile, the
 * current instruction, and the human's draw reveal — all on the felt, not in a
 * white panel. It is a live region (no role="status"; the top bar owns the one
 * turn status) so instruction changes are announced without stealing focus.
 */
export function ActionStage({
  locale,
  view,
  onChooseCard,
  showCoachMark,
  onDismissCoachMark,
}: ActionStageProps): ReactElement {
  const { t, format } = createTranslator(locale);

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {showCoachMark ? <GadhaCoachMark locale={locale} onDismiss={onDismissCoachMark} /> : null}
      <OpponentDrawFan locale={locale} slots={view.hiddenCards} onChooseCard={onChooseCard} />

      <div className="flex flex-col items-center gap-2 text-center">
        <PairDiscardPile justAdded={Boolean(view.draw?.pairRemoved)} />

        <p className="text-xs font-semibold uppercase tracking-widest text-action-secondary">
          {format(view.statusKey, view.statusValues)}
        </p>
        <p
          className="max-w-md text-balance text-base font-bold leading-6 text-text-onBrand drop-shadow-sm sm:text-lg"
          aria-live="polite"
        >
          {format(view.instructionKey, view.instructionValues)}
        </p>
      </div>

      {view.draw ? (
        <DrawAnimationLayer
          locale={locale}
          draw={view.draw}
          reducedMotion={view.settings.reducedMotion}
        />
      ) : null}

      {view.recoverableError ? (
        <p className="rounded-md bg-background-canvas px-3 py-2 text-sm text-status-error">
          {t('error.recoverable')}
        </p>
      ) : null}
    </div>
  );
}
