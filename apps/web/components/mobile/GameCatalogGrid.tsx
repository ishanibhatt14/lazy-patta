'use client';

import Link from 'next/link';
import { useState, type ReactElement } from 'react';

import type { GameSlug } from '../../lib/game-discovery';
import { trackGrowthEvent } from '../../lib/growth/analytics';
import type { Translator } from '../../lib/i18n';
import { recordGameLaunch } from '../../lib/mobile/daily-activity';
import { rememberRecentGame } from '../../lib/mobile/recent';
import type { MobileCatalogItem } from '../../lib/mobile-catalog';

import { BottomSheet } from './BottomSheet';
import { GameTile } from './GameTile';
import { ACCENT_CLASSES } from './accent';
import { GameTileArtwork } from './artwork/GameTileArtwork';
import { PatternBackground } from './artwork/PatternBackground';
import { CardsIcon, LearnIcon, PlayIcon } from './icons';

function isLiveGameSlug(slug: string): slug is GameSlug {
  return slug === 'gadha-chor' || slug === 'lal-satti' || slug === 'jhabbu' || slug === 'kachuful';
}

/**
 * The shared game grid used by both Home and `/mobile/games`. It owns the setup
 * sheet so tapping any tile opens the same bottom sheet everywhere: playable
 * games get real Practice / Create-room / Learn actions (never a dead button),
 * while coming-soon games open an honest info sheet with no broken links.
 */
export function GameCatalogGrid({
  items,
  t,
}: {
  readonly items: readonly MobileCatalogItem[];
  readonly t: Translator;
}): ReactElement {
  const [selected, setSelected] = useState<MobileCatalogItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <GameTile
            key={item.id}
            item={item}
            t={t}
            onSelect={(next) => {
              if (isLiveGameSlug(next.slug)) {
                trackGrowthEvent({ name: 'game_selected', gameSlug: next.slug });
              }
              setSelected(next);
            }}
          />
        ))}
      </div>

      <BottomSheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={
          selected
            ? selected.availability === 'available'
              ? t.format('mobile.setup.title', { name: t.t(selected.nameKey) })
              : t.format('mobile.comingSoon.title', { name: t.t(selected.nameKey) })
            : ''
        }
      >
        {selected ? (
          selected.availability === 'available' ? (
            <SetupBody item={selected} t={t} onLaunch={() => setSelected(null)} />
          ) : (
            <ComingSoonBody item={selected} t={t} onClose={() => setSelected(null)} />
          )
        ) : null}
      </BottomSheet>
    </>
  );
}

/** The accent artwork band shared by the setup and coming-soon sheets. */
function SheetArtworkHeader({
  item,
  t,
}: {
  readonly item: MobileCatalogItem;
  readonly t: Translator;
}): ReactElement {
  const accent = ACCENT_CLASSES[item.accent];
  return (
    <div
      className={`relative mt-4 flex items-center gap-4 overflow-hidden rounded-2xl border border-action-secondary/25 ${accent.fill} px-4 py-3`}
    >
      <PatternBackground className="text-text-onAccent" opacity={0.14} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      <GameTileArtwork gameId={item.id} size="sm" className="relative z-10 drop-shadow-lg" />
      <div className="relative z-10 flex flex-col">
        <span className="text-xs font-semibold text-text-onAccent/80">
          {t.t(item.alternateNamesKey)}
        </span>
        <span className="text-xs font-black uppercase tracking-wide text-text-onAccent">
          {t.format('mobile.game.playersRange', { min: item.minPlayers, max: item.maxPlayers })}
          {' · '}
          {t.format('mobile.game.durationRange', {
            min: item.durationMinutes.min,
            max: item.durationMinutes.max,
          })}
        </span>
      </div>
    </div>
  );
}

type ActionIcon = typeof PlayIcon;

/** One premium action row in the setup sheet: icon disc + title + hint. */
function ActionRow({
  href,
  Icon,
  title,
  hint,
  onClick,
  primary = false,
}: {
  readonly href: string;
  readonly Icon: ActionIcon;
  readonly title: string;
  readonly hint: string;
  readonly onClick?: () => void;
  readonly primary?: boolean;
}): ReactElement {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
        primary
          ? 'border-transparent bg-action-primary text-text-onBrand shadow-md'
          : 'border-action-secondary/25 bg-background-canvas/60 text-action-primary',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          primary ? 'bg-white/20' : 'bg-action-primary/10',
        ].join(' ')}
      >
        <Icon aria-hidden width={22} height={22} />
      </span>
      <span className="flex flex-col">
        <span className="text-base font-black leading-tight">{title}</span>
        <span className={`text-xs ${primary ? 'text-text-onBrand/85' : 'text-text-primary/75'}`}>
          {hint}
        </span>
      </span>
    </Link>
  );
}

function SetupBody({
  item,
  t,
  onLaunch,
}: {
  readonly item: MobileCatalogItem;
  readonly t: Translator;
  readonly onLaunch: () => void;
}): ReactElement {
  return (
    <div>
      <p className="mt-2 text-sm leading-6 text-text-primary/90">{t.t(item.taglineKey)}</p>
      <SheetArtworkHeader item={item} t={t} />

      <div className="mt-4 grid gap-2">
        {item.practiceRoute ? (
          <ActionRow
            href={item.practiceRoute}
            Icon={PlayIcon}
            title={t.t('action.playComputer')}
            hint={t.t('mobile.setup.practiceHint')}
            primary
            onClick={() => {
              rememberRecentGame(item.id);
              recordGameLaunch();
              onLaunch();
            }}
          />
        ) : null}

        {item.roomGameKey ? (
          <ActionRow
            href={`/mobile/rooms?game=${item.roomGameKey}`}
            Icon={CardsIcon}
            title={t.t('action.createRoom')}
            hint={t.t('mobile.setup.roomHint')}
            onClick={onLaunch}
          />
        ) : null}

        {item.rulesRoute ? (
          <ActionRow
            href={item.rulesRoute}
            Icon={LearnIcon}
            title={t.t('action.howToPlay')}
            hint={t.t('mobile.setup.learnHint')}
            onClick={onLaunch}
          />
        ) : null}
      </div>
    </div>
  );
}

function ComingSoonBody({
  item,
  t,
  onClose,
}: {
  readonly item: MobileCatalogItem;
  readonly t: Translator;
  readonly onClose: () => void;
}): ReactElement {
  return (
    <div>
      <p className="mt-2 text-sm leading-6 text-text-primary/90">{t.t(item.taglineKey)}</p>
      <SheetArtworkHeader item={item} t={t} />
      <p className="mt-4 text-sm leading-6 text-text-primary/80">{t.t('mobile.comingSoon.body')}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-4 min-h-12 w-full rounded-xl bg-action-primary px-4 text-sm font-black text-text-onBrand transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      >
        {t.t('action.gotIt')}
      </button>
    </div>
  );
}
