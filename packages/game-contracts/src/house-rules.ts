/**
 * Cross-game regional preset registry (ADR-0006: behavior is data, not code).
 *
 * This module is a *catalog* of the rule variants the engines already
 * implement — nothing here invents new behavior. Each preset's `id` is the
 * exact `RulePack.id` used by the corresponding engine, so a preset can be
 * mapped straight onto an engine rule pack at table-setup time.
 *
 * game-contracts is the base package, so this registry holds only plain data
 * (string ids + localization keys). It must never import an engine package —
 * that would create a dependency cycle.
 */

export type HouseRuleGameSlug = 'gadha-chor' | 'lal-satti' | 'jhabbu' | 'kachuful';

export const HOUSE_RULE_GAME_SLUGS: readonly HouseRuleGameSlug[] = [
  'gadha-chor',
  'lal-satti',
  'jhabbu',
  'kachuful',
] as const;

/**
 * A selectable house-rule preset for a game. `id` matches the engine
 * `RulePack.id` it resolves to; `labelKey`/`descriptionKey` are localization
 * message keys resolved by the app layer (validated by a message-parity test).
 */
export interface RegionalPreset {
  readonly id: string;
  readonly gameSlug: HouseRuleGameSlug;
  readonly labelKey: string;
  readonly descriptionKey: string;
  /** Exactly one preset per game is the default. */
  readonly isDefault: boolean;
}

/**
 * The registry. Every preset id below corresponds to a rule pack that an
 * engine ships today — no aspirational variants.
 */
export const REGIONAL_PRESETS: Readonly<Record<HouseRuleGameSlug, readonly RegionalPreset[]>> = {
  'gadha-chor': [
    {
      id: 'classic-gulam-chor',
      gameSlug: 'gadha-chor',
      labelKey: 'houseRules.gadhaChor.classicGulamChor.label',
      descriptionKey: 'houseRules.gadhaChor.classicGulamChor.description',
      isDefault: true,
    },
  ],
  'lal-satti': [
    {
      id: 'lal-satti-classic-seven-of-hearts',
      gameSlug: 'lal-satti',
      labelKey: 'houseRules.lalSatti.classicSevenOfHearts.label',
      descriptionKey: 'houseRules.lalSatti.classicSevenOfHearts.description',
      isDefault: true,
    },
    {
      id: 'lal-satti-all-sevens-open',
      gameSlug: 'lal-satti',
      labelKey: 'houseRules.lalSatti.allSevensOpen.label',
      descriptionKey: 'houseRules.lalSatti.allSevensOpen.description',
      isDefault: false,
    },
  ],
  jhabbu: [
    {
      id: 'gujarati-family-v1',
      gameSlug: 'jhabbu',
      labelKey: 'houseRules.jhabbu.gujaratiFamily.label',
      descriptionKey: 'houseRules.jhabbu.gujaratiFamily.description',
      isDefault: true,
    },
    {
      id: 'classic-bhabho-v1',
      gameSlug: 'jhabbu',
      labelKey: 'houseRules.jhabbu.classicBhabho.label',
      descriptionKey: 'houseRules.jhabbu.classicBhabho.description',
      isDefault: false,
    },
  ],
  kachuful: [
    {
      id: 'family-descending-v1',
      gameSlug: 'kachuful',
      labelKey: 'houseRules.kachuful.familyDescending.label',
      descriptionKey: 'houseRules.kachuful.familyDescending.description',
      isDefault: true,
    },
  ],
};

/** All presets available for a game, in display order. */
export function presetsFor(gameSlug: HouseRuleGameSlug): readonly RegionalPreset[] {
  return REGIONAL_PRESETS[gameSlug];
}

/** The single default preset for a game. */
export function defaultPresetFor(gameSlug: HouseRuleGameSlug): RegionalPreset {
  const preset = REGIONAL_PRESETS[gameSlug].find((candidate) => candidate.isDefault);
  if (!preset) {
    throw new Error(`No default regional preset registered for ${gameSlug}`);
  }
  return preset;
}

/** True when `presetId` is a known preset for the given game. */
export function isKnownPreset(gameSlug: HouseRuleGameSlug, presetId: string): boolean {
  return REGIONAL_PRESETS[gameSlug].some((candidate) => candidate.id === presetId);
}

/**
 * Resolve a requested preset id for a game, falling back to the game's default
 * when the id is missing or unknown. Always returns a real, engine-backed
 * preset — never throws for bad input.
 */
export function resolvePreset(
  gameSlug: HouseRuleGameSlug,
  presetId: string | null | undefined,
): RegionalPreset {
  if (presetId) {
    const match = REGIONAL_PRESETS[gameSlug].find((candidate) => candidate.id === presetId);
    if (match) return match;
  }
  return defaultPresetFor(gameSlug);
}
