'use client';

import type { ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import type { MobileCatalogItem } from '../../lib/mobile-catalog';

import { ACCENT_CLASSES } from './accent';
import { GameTileArtwork } from './artwork/GameTileArtwork';
import { PatternBackground } from './artwork/PatternBackground';

/**
 * A game in the catalog grid: one fully-tappable tile (not a card with a nested
 * link) so the whole surface is a single large touch target. The upper "art"
 * band carries the game's identity accent, a faint suit texture and its own card
 * fan; the lower strip holds the name, alternate name and table facts. Everything
 * — accent, artwork, metadata — is driven by the catalog item, so a new game
 * needs no bespoke styling. Coming-soon games dim the art and show an honest
 * badge, and still open an info sheet (never a broken route).
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-action-secondary/30 bg-surface-primary text-left shadow-lg transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
    >
      <div className={`relative flex h-[5.5rem] items-center justify-center ${accent.fill}`}>
        <PatternBackground className="text-text-onAccent" opacity={0.14} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10" />
        <GameTileArtwork
          gameId={item.id}
          size="sm"
          className={`relative z-10 drop-shadow-lg ${comingSoon ? 'opacity-70' : ''}`}
        />
        <span className="absolute right-2 top-2 z-10">
          {comingSoon ? (
            <span className="rounded-full bg-black/45 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-text-onAccent backdrop-blur">
              {t.t('mobile.game.comingSoonBadge')}
            </span>
          ) : (
            <span className="rounded-full bg-black/35 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-wide text-text-onAccent backdrop-blur">
              {t.t(item.difficultyKey)}
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 px-3 pb-3 pt-2">
        <h3 className="text-base font-black leading-tight text-action-primary">
          {t.t(item.nameKey)}
        </h3>
        <p className="truncate text-[0.7rem] font-semibold text-text-primary/60">
          {t.t(item.alternateNamesKey)}
        </p>
        <p className="mt-1 text-[0.7rem] font-bold text-text-primary/80">
          {t.format('mobile.game.playersRange', { min: item.minPlayers, max: item.maxPlayers })}
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
