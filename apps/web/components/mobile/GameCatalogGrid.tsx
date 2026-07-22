'use client';

import Link from 'next/link';
import { useState, type ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import { rememberRecentGame } from '../../lib/mobile/recent';
import type { MobileCatalogItem } from '../../lib/mobile-catalog';

import { BottomSheet } from './BottomSheet';
import { GameTile } from './GameTile';

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
          <GameTile key={item.id} item={item} t={t} onSelect={setSelected} />
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

const ACTION_CLASS =
  'flex flex-col rounded-xl border border-action-primary/15 bg-background-canvas px-4 py-3 text-left transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent';

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
    <div className="mt-2">
      <p className="text-sm leading-6 text-text-primary">{t.t(item.taglineKey)}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-brand-accent">
        {t.format('mobile.game.playersRange', { min: item.minPlayers, max: item.maxPlayers })}
        {' · '}
        {t.format('mobile.game.durationRange', {
          min: item.durationMinutes.min,
          max: item.durationMinutes.max,
        })}
      </p>

      <div className="mt-4 grid gap-2">
        {item.practiceRoute ? (
          <Link
            href={item.practiceRoute}
            onClick={() => {
              rememberRecentGame(item.id);
              onLaunch();
            }}
            className={ACTION_CLASS}
          >
            <span className="text-base font-black text-action-primary">
              {t.t('action.playComputer')}
            </span>
            <span className="text-xs text-text-primary/80">{t.t('mobile.setup.practiceHint')}</span>
          </Link>
        ) : null}

        {item.roomGameKey ? (
          <Link href={`/mobile/rooms?game=${item.roomGameKey}`} onClick={onLaunch} className={ACTION_CLASS}>
            <span className="text-base font-black text-action-primary">
              {t.t('action.createRoom')}
            </span>
            <span className="text-xs text-text-primary/80">{t.t('mobile.setup.roomHint')}</span>
          </Link>
        ) : null}

        {item.rulesRoute ? (
          <Link href={item.rulesRoute} onClick={onLaunch} className={ACTION_CLASS}>
            <span className="text-base font-black text-action-primary">
              {t.t('action.howToPlay')}
            </span>
            <span className="text-xs text-text-primary/80">{t.t('mobile.setup.learnHint')}</span>
          </Link>
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
    <div className="mt-2">
      <p className="text-sm leading-6 text-text-primary">{t.t(item.taglineKey)}</p>
      <p className="mt-2 text-sm leading-6 text-text-primary/80">{t.t('mobile.comingSoon.body')}</p>
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
