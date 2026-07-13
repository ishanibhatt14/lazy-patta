import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

import { createTranslator } from '../../../../lib/i18n';
import { LAL_SATTI_HUMAN_ID } from '../players';
import type { LalSattiViewState } from '../types';

interface ScoreDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly locale: Locale;
  readonly view: LalSattiViewState;
  readonly leaderName: string | null;
}

function displayName(name: string, locale: Locale): string {
  if (name === LAL_SATTI_HUMAN_ID) return createTranslator(locale).t('computer.youName');
  return name;
}

/**
 * The session scoreboard on demand — a bottom sheet on mobile, a right-anchored
 * panel on wider screens. Holds the current match leader, running totals, and
 * the per-round history with leftover cards. Replaces the permanent scoreboard
 * sidebar. Escape and the scrim both close it.
 */
export function ScoreDrawer({
  open,
  onClose,
  locale,
  view,
  leaderName,
}: ScoreDrawerProps): ReactElement | null {
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
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button
        type="button"
        aria-label={t('action.close')}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ls-score-title"
        className="ls-sheet relative flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface-primary p-5 shadow-md sm:h-full sm:max-h-none sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="ls-score-title" className="text-lg font-bold text-action-primary">
              {t('lalSatti.scoreboardTitle')}
            </h2>
            <p className="text-sm text-text-primary">{t('lalSatti.scoreboardHelp')}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('action.close')}
            className="flex min-h-12 min-w-12 items-center justify-center rounded-md border border-action-primary text-lg font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>

        {view.roundScores.length === 0 ? (
          <p className="rounded-md bg-background-canvas px-3 py-2 text-sm font-semibold text-brand-accent">
            {t('lalSatti.scoreboardEmpty')}
          </p>
        ) : (
          <>
            {leaderName ? (
              <p className="rounded-md bg-brand-accent px-3 py-2 text-sm font-bold text-text-onBrand">
                {format('lalSatti.matchLeaderLine', { name: displayName(leaderName, locale) })}
              </p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-action-primary">
                  <tr>
                    <th className="py-2 pr-3">{t('lalSatti.scoreboardPlayer')}</th>
                    <th className="py-2 pr-3">{t('lalSatti.scoreboardTotalLeft')}</th>
                    <th className="py-2">{t('lalSatti.scoreboardRoundsNotWon')}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.runningScores.map((score) => (
                    <tr key={score.playerId} className="border-t border-brand-accent">
                      <td className="py-2 pr-3 font-semibold">
                        {displayName(score.playerName, locale)}
                      </td>
                      <td className="py-2 pr-3">{score.totalLeftoverCards}</td>
                      <td className="py-2">{score.roundsNotWon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ol className="space-y-3 text-sm leading-6">
              {view.roundScores.map((round) => (
                <li key={round.id} className="rounded-md bg-background-canvas p-3">
                  <p className="font-bold text-action-primary">
                    {format('lalSatti.roundScoreLabel', { round: round.roundNumber })}
                  </p>
                  <p>
                    {format('lalSatti.roundWinnerLine', {
                      name: round.winnerNames.map((name) => displayName(name, locale)).join(', '),
                    })}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {round.leftovers.map((leftover) => (
                      <li key={leftover.playerId}>
                        {format('lalSatti.leftoverLine', {
                          name: displayName(leftover.playerName, locale),
                          count: leftover.cardCount,
                        })}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
