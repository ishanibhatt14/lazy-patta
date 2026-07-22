import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import type { ComputerGameViewState } from '../../../lib/computer-game/types';
import { trackGrowthEvent } from '../../../lib/growth/analytics';
import { buildShareableGameResult } from '../../../lib/growth/results';
import { shareGameResult } from '../../../lib/growth/share-result';
import { createTranslator } from '../../../lib/i18n';
import { Button } from '../../Button';
import { GadhaMascotPlaceholder } from '../art';

interface GadhaRevealProps {
  readonly locale: Locale;
  readonly view: ComputerGameViewState;
  readonly onRematch: () => void;
}

/**
 * The staged end-of-round reveal: the table dims, the final card moves to the
 * center and flips to reveal the Gadha mascot, then "Today's Gadha Chor" with
 * the winner and a few playful, affectionate stats. Tone stays warm — a family
 * table moment, never humiliating.
 */
export function GadhaReveal({ locale, view, onRematch }: GadhaRevealProps): ReactElement | null {
  const translator = createTranslator(locale);
  const { t, format } = translator;
  const [shareNote, setShareNote] = useState<string | null>(null);
  const isResult = view.phase === 'result' && view.result !== null;

  useEffect(() => {
    if (!isResult) return;
    trackGrowthEvent({
      name: 'round_completed',
      gameSlug: 'gadha-chor',
      playerCount: view.seats.length,
      roundNumber: 1,
    });
  }, [isResult, view.seats.length]);

  if (!isResult || !view.result) return null;

  const { gadhaChorIsSelf, gadhaChorName, winnerNames } = view.result;

  const heading = gadhaChorIsSelf
    ? t('computer.youAreGadhaChor')
    : format('result.gadhaChor', { name: gadhaChorName });

  const safeLine =
    winnerNames.length > 0
      ? format('computer.revealSafeCount', { count: winnerNames.length })
      : t('computer.revealNoSafe');

  const onShare = async (): Promise<void> => {
    const shareable = buildShareableGameResult({
      gameSlug: 'gadha-chor',
      gameName: t('games.gadhaChor.name'),
      ...(winnerNames[0] ? { winnerDisplayName: winnerNames[0] } : {}),
      playerCount: view.seats.length,
      t: translator,
    });
    const outcome = await shareGameResult(shareable, translator);
    if (outcome === 'copied') setShareNote(t('computer.shareCopied'));
  };

  return (
    <div className="gc-reveal-backdrop absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-action-secondary/30 bg-surface-primary p-6 text-center shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-accent">
          {t('computer.todaysGadhaChor')}
        </p>

        <div className="gc-reveal-card">
          <div className="gc-reveal-inner">
            <GadhaMascotPlaceholder size={112} label={t('label.gadhaChor')} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-action-primary">{heading}</h2>
        <p className="text-sm leading-6 text-text-primary">{t('computer.gadhaChorReveal')}</p>

        <div className="w-full rounded-md bg-background-canvas px-4 py-3 text-sm text-text-primary">
          <p className="font-semibold text-action-primary">{t('computer.revealSafeTitle')}</p>
          <p>{safeLine}</p>
          {winnerNames.length > 0 ? (
            <p className="mt-1 font-semibold text-brand-accent">{winnerNames.join(' · ')}</p>
          ) : null}
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2">
          <Button className="min-h-12" onClick={onRematch}>
            {t('action.playAgain')}
          </Button>
          <Button variant="ghost" className="min-h-12" onClick={() => void onShare()}>
            {t('action.shareResult')}
          </Button>
        </div>

        <a
          href="/mobile"
          className="inline-flex min-h-12 items-center justify-center text-base font-semibold text-action-primary underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t('action.returnHome')}
        </a>

        {shareNote ? (
          <p className="text-xs font-semibold text-brand-accent" aria-live="polite">
            {shareNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
