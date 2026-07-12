import { DEFAULT_LOCALE, formatMessage, getMessages } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import type { ComputerGameViewEvent, ComputerGameViewState } from '../../lib/computer-game/types';

const t = getMessages(DEFAULT_LOCALE);

interface GameStatusPanelProps {
  readonly state: ComputerGameViewState;
  readonly onToggleSound: () => void;
  readonly onToggleReducedMotion: () => void;
}

function eventLabel(event: ComputerGameViewEvent): string {
  return formatMessage(DEFAULT_LOCALE, event.messageKey, { name: event.playerName ?? '' });
}

export function GameStatusPanel({
  state,
  onToggleSound,
  onToggleReducedMotion,
}: GameStatusPanelProps): ReactElement {
  return (
    <aside className="flex flex-col gap-4 rounded-lg bg-surface-primary p-4 shadow-md lg:min-w-72">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-action-primary">{t['computer.tablePanelTitle']}</h2>
          <p className="text-sm text-text-primary">{t['computer.tablePanelSubtitle']}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onToggleSound}
          className="min-h-12 rounded-md border border-action-primary bg-background-canvas px-3 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          aria-pressed={state.settings.soundEnabled}
        >
          {state.settings.soundEnabled ? t['settings.soundOn'] : t['settings.soundOff']}
        </button>
        <button
          type="button"
          onClick={onToggleReducedMotion}
          className="min-h-12 rounded-md border border-action-primary bg-background-canvas px-3 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          aria-pressed={state.settings.reducedMotion}
        >
          {t['settings.reducedMotion']}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-action-primary">{t['computer.eventLog']}</span>
        <div className="grid gap-2" aria-live="polite">
          {state.events.map((event) => (
            <p
              key={event.id}
              className="rounded-md bg-background-canvas px-3 py-2 text-sm text-text-primary"
            >
              {eventLabel(event)}
            </p>
          ))}
          {state.events.length === 0 ? (
            <p className="rounded-md bg-background-canvas px-3 py-2 text-sm text-text-primary">
              {t['computer.eventReady']}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
