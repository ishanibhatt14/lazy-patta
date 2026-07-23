import { resolvePreset, type HouseRuleGameSlug } from '@lazy-patta/game-contracts';
import type { MessageKey } from '@lazy-patta/localization';

import { type OnlineGameKey } from '../rooms/rooms-client';

/**
 * Pure lookups that turn the online game_key a family stores (gadha_chor,
 * lal_satti, …) into the localization keys the Family Table social layer renders.
 * Kept free of React and Supabase so the mapping is unit-testable on its own.
 */

const GAME_NAME_KEYS: Record<OnlineGameKey, MessageKey> = {
  gadha_chor: 'games.gadhaChor.name',
  lal_satti: 'games.lalSatti.name',
  jhabbu: 'games.jhabbu.name',
  kachuful: 'games.kachuful.name',
};

/** The message key for a game's display name (e.g. "Lal Satti"). */
export function familyGameNameKey(gameKey: OnlineGameKey): MessageKey {
  return GAME_NAME_KEYS[gameKey];
}

// The rooms allow-list uses underscores (lal_satti); the house-rules registry is
// keyed by the hyphenated public slug (lal-satti). This bridges the two.
const ONLINE_KEY_TO_SLUG: Record<OnlineGameKey, HouseRuleGameSlug> = {
  gadha_chor: 'gadha-chor',
  lal_satti: 'lal-satti',
  jhabbu: 'jhabbu',
  kachuful: 'kachuful',
};

/**
 * The message key for a stored house-rule preset's label, or null when the
 * family kept the game default (no preset pinned). An unknown id resolves to the
 * game's default label rather than throwing, matching resolvePreset's contract.
 */
export function familyPresetLabelKey(
  gameKey: OnlineGameKey,
  presetId: string | null | undefined,
): MessageKey | null {
  if (!presetId) return null;
  return resolvePreset(ONLINE_KEY_TO_SLUG[gameKey], presetId).labelKey as MessageKey;
}
