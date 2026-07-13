import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../../lib/i18n';
import type { LalSattiViewState } from '../types';

interface LalSattiTopBarProps {
  readonly locale: Locale;
  readonly view: LalSattiViewState;
  readonly leaderName: string | null;
  readonly onOpenScores: () => void;
  readonly onOpenSettings: () => void;
}

const ICON_BUTTON =
  'flex min-h-12 min-w-12 items-center justify-center rounded-full bg-background-canvas/90 text-lg text-action-primary shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent';

/**
 * A compact bar over the table. Left: the mode eyebrow and the single live turn
 * status (the only role="status" on the table). Right: the running round
 * indicator, current match leader, a scores button, and a settings button —
 * replacing the old permanent scoreboard sidebar.
 */
export function LalSattiTopBar({
  locale,
  view,
  leaderName,
  onOpenScores,
  onOpenSettings,
}: LalSattiTopBarProps): ReactElement {
  const { t, format } = createTranslator(locale);

  const roundNumber =
    view.phase === 'result' ? view.roundScores.length : view.roundScores.length + 1;

  const turnText = view.isHumanTurn
    ? t('turn.yours')
    : view.currentPlayerName
      ? format('lalSatti.turnPlaying', { name: view.currentPlayerName })
      : t('computer.tableReady');

  return (
    <header className="flex items-center justify-between gap-2 px-1 py-1">
      <div className="flex min-w-0 flex-col">
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-text-onBrand/70">
          {t('lalSatti.modeLabel')}
        </span>
        <div
          className="flex items-center gap-1.5 text-sm font-bold text-text-onBrand"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden>{view.isHumanTurn ? '🪷' : '⏳'}</span>
          <span className="truncate">{turnText}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden rounded-full bg-[color-mix(in_srgb,var(--lp-background-canvas)_85%,transparent)] px-3 py-1 text-xs font-bold text-action-primary sm:inline">
          {format('lalSatti.roundIndicator', { round: roundNumber })}
        </span>
        {leaderName ? (
          <span className="hidden max-w-[10rem] truncate rounded-full bg-brand-accent px-3 py-1 text-xs font-bold text-text-onBrand md:inline">
            {format('lalSatti.leaderChip', { name: leaderName })}
          </span>
        ) : null}

        <button
          type="button"
          onClick={onOpenScores}
          aria-label={t('lalSatti.scoreboardTitle')}
          className={ICON_BUTTON}
        >
          <span aria-hidden>📊</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label={t('action.settings')}
          className={ICON_BUTTON}
        >
          <span aria-hidden>⚙️</span>
        </button>
      </div>
    </header>
  );
}
