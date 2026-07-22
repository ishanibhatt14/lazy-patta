'use client';

import type { ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import type { MobileCatalogItem } from '../../lib/mobile-catalog';

import { ACCENT_CLASSES } from './accent';

/**
 * A game in the catalog grid, rendered as one fully-tappable button (not a card
 * with a nested link) so the whole surface is a single large touch target. The
 * accent stripe and metadata come entirely from the catalog item, so tiles stay
 * consistent and a new game needs no bespoke styling.
 */
export function GameTile({
  item,
  t,
  onSelect,
}: {
  readonly item: MobileCatalogItem;
  readonly t: Translator;
  readonly onSelect: (item: MobileCatalogItem) => void;
}): ReactElement {
  const accent = ACCENT_CLASSES[item.accent];
  const comingSoon = item.availability === 'coming-soon';

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex min-h-[7.5rem] flex-col justify-between gap-3 rounded-2xl border border-action-primary/12 bg-surface-primary p-4 text-left shadow-sm transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${accent.fill} ${accent.text}`}
          aria-hidden
        >
          {t.t(item.nameKey).trim().charAt(0)}
        </span>
        {comingSoon ? (
          <span className="rounded-full bg-action-primary/10 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-action-primary">
            {t.t('mobile.game.comingSoonBadge')}
          </span>
        ) : (
          <span className="rounded-full bg-brand-accent/12 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-brand-accent">
            {t.t(item.difficultyKey)}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-lg font-black leading-tight text-action-primary">
          {t.t(item.nameKey)}
        </h3>
        <p className="mt-1 text-xs font-semibold text-text-primary/80">
          {t.format('mobile.game.playersRange', {
            min: item.minPlayers,
            max: item.maxPlayers,
          })}
          {' · '}
          {t.format('mobile.game.durationRange', {
            min: item.durationMinutes.min,
            max: item.durationMinutes.max,
          })}
        </p>
      </div>
    </button>
  );
}
