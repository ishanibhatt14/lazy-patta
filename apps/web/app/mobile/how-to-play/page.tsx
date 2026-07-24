'use client';

import type { MessageKey } from '@lazy-patta/localization';
import { useMemo, useState, type ReactElement } from 'react';

import { GameTile } from '../../../components/mobile/GameTile';
import { HowToPlaySheet } from '../../../components/mobile/HowToPlaySheet';
import { createTranslator } from '../../../lib/i18n';
import { filterHandbook, type DifficultyFilter } from '../../../lib/learn/handbook';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';
import { MOBILE_CATALOG, type MobileCatalogItem } from '../../../lib/mobile-catalog';

/** The difficulty chips, in shelf order: everything, then each tier. */
const DIFFICULTY_CHIPS: readonly {
  readonly value: DifficultyFilter;
  readonly labelKey: MessageKey;
}[] = [
  { value: 'all', labelKey: 'mobile.learn.filterAll' },
  { value: 'easy', labelKey: 'mobile.difficulty.easy' },
  { value: 'strategy', labelKey: 'mobile.difficulty.strategy' },
  { value: 'fast', labelKey: 'mobile.difficulty.fast' },
];

/**
 * The Learn surface as a visual handbook: a searchable, filterable shelf of game
 * tiles (the same art-rich tiles as the catalog) rather than a flat text list.
 * Searching matches a game's name and every regional/family name, so "gulaam
 * chor" or "judgement" still lands on the right game whatever the app language.
 * Tapping a tile opens the rules sheet — the pure filter lives in lib/learn so it
 * stays unit-tested and locale-free.
 */
export default function MobileLearnPage(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [selected, setSelected] = useState<MobileCatalogItem | null>(null);

  // Only games with a rules page belong in the handbook; each carries a resolved
  // searchable haystack (name + tagline + every alternate name) in the active
  // locale so the pure filter never needs a translator.
  const entries = useMemo(
    () =>
      MOBILE_CATALOG.filter((item) => item.rulesRoute).map((item) => ({
        item,
        difficulty: item.difficulty,
        text: [t.t(item.nameKey), t.t(item.taglineKey), t.t(item.alternateNamesKey)].join(' '),
      })),
    [t],
  );

  const results = filterHandbook(entries, query, difficulty);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-black text-action-primary">{t.t('mobile.learn.title')}</h1>
        <p className="mt-1 text-sm leading-6 text-text-primary/80">
          {t.t('mobile.learn.subtitle')}
        </p>
      </header>

      <label className="flex flex-col gap-1">
        <span className="sr-only">{t.t('mobile.learn.searchLabel')}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.t('mobile.learn.searchPlaceholder')}
          aria-label={t.t('mobile.learn.searchLabel')}
          className="w-full rounded-2xl border border-action-primary/15 bg-surface-primary px-4 py-3 text-sm text-text-primary shadow-sm placeholder:text-text-primary/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        />
      </label>

      <div
        role="group"
        aria-label={t.t('mobile.learn.searchLabel')}
        className="flex flex-wrap gap-2"
      >
        {DIFFICULTY_CHIPS.map((chip) => {
          const active = difficulty === chip.value;
          return (
            <button
              key={chip.value}
              type="button"
              aria-pressed={active}
              onClick={() => setDifficulty(chip.value)}
              className={[
                'rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                active
                  ? 'bg-action-primary text-text-onAccent shadow-sm'
                  : 'bg-action-primary/10 text-action-primary',
              ].join(' ')}
            >
              {t.t(chip.labelKey)}
            </button>
          );
        })}
      </div>

      {results.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3">
          {results.map((entry) => (
            <li key={entry.item.id}>
              <GameTile item={entry.item} t={t} onSelect={setSelected} />
            </li>
          ))}
        </ul>
      ) : (
        <p
          role="status"
          className="rounded-2xl border border-dashed border-action-primary/25 px-4 py-8 text-center text-sm font-semibold text-text-primary/70"
        >
          {t.t('mobile.learn.noResults')}
        </p>
      )}

      <HowToPlaySheet item={selected} t={t} onClose={() => setSelected(null)} />
    </div>
  );
}
