export const KACHUFUL_HUMAN_ID = 'you';

export interface KachufulRosterEntry {
  readonly id: string;
  /** Proper-noun bot name; empty for the human (rendered as a localized "You"). */
  readonly name: string;
  readonly avatarInitial: string;
  readonly isBot: boolean;
}

/**
 * Warm family table — the same proper nouns used across Lazy Patta. Names stay
 * Latin in every locale, so the avatar initial is the Latin first letter to
 * match (a Gujarati-script glyph looked wrong next to a Latin name).
 */
const BOT_ROSTER: readonly { name: string; avatarInitial: string }[] = [
  { name: 'Ba', avatarInitial: 'B' },
  { name: 'Kaka', avatarInitial: 'K' },
  { name: 'Masi', avatarInitial: 'M' },
  { name: 'Mama', avatarInitial: 'M' },
  { name: 'Kaki', avatarInitial: 'K' },
  { name: 'Dada', avatarInitial: 'D' },
];

export function buildKachufulRoster(playerCount: number): readonly KachufulRosterEntry[] {
  const botCount = Math.max(2, playerCount - 1);
  const bots = BOT_ROSTER.slice(0, botCount).map((bot, index) => ({
    id: `bot-${index + 1}`,
    name: bot.name,
    avatarInitial: bot.avatarInitial,
    isBot: true,
  }));

  return [{ id: KACHUFUL_HUMAN_ID, name: '', avatarInitial: '★', isBot: false }, ...bots];
}

export function rosterName(roster: readonly KachufulRosterEntry[], playerId: string): string {
  return roster.find((entry) => entry.id === playerId)?.name ?? playerId;
}
