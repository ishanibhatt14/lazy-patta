import type { Locale, MessageKey } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import type { ComputerGameSeat, ComputerGameViewState } from '../../../lib/computer-game/types';
import { createTranslator } from '../../../lib/i18n';

interface GameTopBarProps {
  readonly locale: Locale;
  readonly view: ComputerGameViewState;
  readonly onOpenSettings: () => void;
}

const POSITION_KEY: Record<ComputerGameSeat['position'], MessageKey> = {
  top: 'seat.positionTop',
  left: 'seat.positionLeft',
  right: 'seat.positionRight',
  bottom: 'seat.positionBottom',
};

/**
 * A compact bar over the scene. Left: the mode eyebrow and the single live turn
 * status (the only role="status" on the table). Right: a settings button that
 * opens the sheet, replacing the old permanent status sidebar.
 */
export function GameTopBar({ locale, view, onOpenSettings }: GameTopBarProps): ReactElement {
  const { t, format } = createTranslator(locale);
  const { currentTurn } = view;
  const activeSeat = view.seats.find((seat) => seat.id === currentTurn.seatId);
  const positionLabel = activeSeat ? t(POSITION_KEY[activeSeat.position]) : '';

  const turnText = currentTurn.isSelf
    ? t('turn.yours')
    : currentTurn.seatId
      ? format('turn.playingSeat', { name: currentTurn.name, position: positionLabel })
      : t('computer.tableReady');

  return (
    <header className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex min-w-0 flex-col">
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-text-onBrand/70">
          {t('computer.modeLabel')}
        </span>
        <div
          className="flex items-center gap-1.5 text-sm font-bold text-text-onBrand"
          role="status"
          aria-live="polite"
        >
          <span aria-hidden>{currentTurn.isSelf ? '🪷' : '⏳'}</span>
          <span className="truncate">{turnText}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        aria-label={t('action.settings')}
        className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-background-canvas/90 text-lg text-action-primary shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      >
        <span aria-hidden>⚙️</span>
      </button>
    </header>
  );
}
