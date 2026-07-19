import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { createTranslator } from '../../../lib/i18n';

import { JHABBU_HUMAN_ID } from './players';
import type { JhabbuViewState } from './types';

interface JhabbuScoreDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly locale: Locale;
  readonly view: JhabbuViewState;
  readonly leaderName: string | null;
}

function displayName(name: string, locale: Locale): string {
  if (name === JHABBU_HUMAN_ID) return createTranslator(locale).t('computer.youName');
  return name;
}

/**
 * The session scoreboard on demand — a bottom sheet that mirrors the Lal Satti
 * score drawer. Holds the current match leader, running penalty totals, and the
 * per-round history with each round's thulla (loser). Escape and the scrim close it.
 */
export function JhabbuScoreDrawer({
  open,
  onClose,
  locale,
  view,
  leaderName,
}: JhabbuScoreDrawerProps): ReactElement | null {
  const { t, format } = createTranslator(locale);
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
        aria-labelledby="jh-score-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="jh-score-title" className="text-lg font-black text-action-primary">
              {t('jhabbu.scoreboardTitle')}
            </h2>
            <p className="text-sm text-text-primary">{t('jhabbu.scoreboardHelp')}</p>
          </div>
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

        {view.roundScores.length === 0 ? (
          <p className="mt-4 rounded-md bg-background-canvas px-3 py-2 text-sm font-semibold text-brand-accent">
            {t('jhabbu.scoreboardEmpty')}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {leaderName ? (
              <p className="rounded-md bg-brand-accent px-3 py-2 text-sm font-bold text-text-onBrand">
                {format('jhabbu.matchLeaderLine', { name: displayName(leaderName, locale) })}
              </p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-action-primary">
                  <tr>
                    <th className="py-2 pr-3">{t('jhabbu.scoreboardPlayer')}</th>
                    <th className="py-2 pr-3">{t('jhabbu.scoreboardTotalPenalty')}</th>
                    <th className="py-2">{t('jhabbu.scoreboardRoundsLost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.runningScores.map((score) => (
                    <tr key={score.playerId} className="border-t border-brand-accent">
                      <td className="py-2 pr-3 font-semibold">
                        {displayName(score.playerName, locale)}
                      </td>
                      <td className="py-2 pr-3">{score.totalPenaltyPoints}</td>
                      <td className="py-2">{score.roundsLost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ol className="space-y-3 text-sm leading-6">
              {view.roundScores.map((round) => (
                <li key={round.id} className="rounded-md bg-background-canvas p-3">
                  <p className="font-bold text-action-primary">
                    {format('jhabbu.roundScoreLabel', { round: round.roundNumber })}
                  </p>
                  <p>
                    {format('jhabbu.roundLoserLine', {
                      name: displayName(round.loserName, locale),
                    })}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {round.standings.map((standing) => (
                      <li key={standing.playerId}>
                        {format('jhabbu.standingLine', {
                          name: displayName(standing.playerName, locale),
                          points: standing.penaltyPoints,
                          count: standing.remainingCards,
                        })}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
