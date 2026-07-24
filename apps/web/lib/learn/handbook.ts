import type { GameDifficulty } from '../mobile-catalog';

/**
 * The Learn surface reads as a visual handbook: a searchable, filterable shelf of
 * games rather than a flat list. The filtering itself is pure and locale-free so
 * it can be unit-tested without a translator — the caller resolves each game's
 * searchable text (name plus every regional/alternate name) in the active locale
 * and hands it in, so a family searching "gulaam chor" or "judgement" still finds
 * the right game whatever language the app is in.
 */

/** "all" plus every catalog difficulty tier — the handbook's filter chips. */
export type DifficultyFilter = 'all' | GameDifficulty;

/** The minimum a handbook entry must expose to be searched and filtered. */
export interface HandbookSearchable {
  readonly difficulty: GameDifficulty;
  /** Pre-resolved searchable text (name + aliases + tagline), any case. */
  readonly text: string;
}

/** True when an entry survives both the difficulty chip and the search box. */
export function matchesHandbookFilter(
  entry: HandbookSearchable,
  query: string,
  difficulty: DifficultyFilter,
): boolean {
  if (difficulty !== 'all' && entry.difficulty !== difficulty) return false;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return entry.text.toLowerCase().includes(needle);
}

/** Narrow a handbook shelf to the entries matching the current search + chip. */
export function filterHandbook<T extends HandbookSearchable>(
  entries: readonly T[],
  query: string,
  difficulty: DifficultyFilter,
): readonly T[] {
  return entries.filter((entry) => matchesHandbookFilter(entry, query, difficulty));
}
