'use client';

import type { Locale } from '@lazy-patta/localization';
import { useState, type ReactElement } from 'react';

import type { GameSlug } from '../../lib/game-discovery';
import { buildShareableGameResult } from '../../lib/growth/results';
import { shareGameResult } from '../../lib/growth/share-result';
import { createTranslator } from '../../lib/i18n';
import { Button } from '../Button';

/**
 * End-of-game actions for a live room, shown inside every game-over overlay.
 * Offers "Play again" (only when the host can restart, via `onRematch`) and a
 * "Share result" affordance that reuses the same warm, family-friendly share
 * text and native-share/clipboard path as the solo result screens. Sharing is a
 * nicety — it never throws over the friendly result card, and a cancelled share
 * sheet is not counted.
 */
export function RoomEndActions({
  locale,
  gameSlug,
  gameName,
  winnerDisplayName,
  playerCount,
  onRematch,
  busy,
}: {
  readonly locale: Locale;
  readonly gameSlug: GameSlug;
  readonly gameName: string;
  readonly winnerDisplayName?: string;
  readonly playerCount: number;
  readonly onRematch?: () => void;
  readonly busy?: boolean;
}): ReactElement {
  const translator = createTranslator(locale);
  const { t } = translator;
  const [note, setNote] = useState<string | null>(null);

  const onShare = async (): Promise<void> => {
    const shareable = buildShareableGameResult({
      gameSlug,
      gameName,
      ...(winnerDisplayName ? { winnerDisplayName } : {}),
      playerCount,
      t: translator,
    });
    const outcome = await shareGameResult(shareable, translator);
    if (outcome === 'copied') setNote(t('computer.shareCopied'));
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        {onRematch ? (
          <Button size="sm" className="min-h-12 flex-1" disabled={busy} onClick={onRematch}>
            {t('action.playAgain')}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="min-h-12 flex-1"
          onClick={() => void onShare()}
        >
          {t('action.shareResult')}
        </Button>
      </div>
      {note ? (
        <p role="status" aria-live="polite" className="text-xs font-semibold text-brand-accent">
          {note}
        </p>
      ) : null}
    </div>
  );
}
