export const LAL_SATTI_HUMAN_ID = 'you';

export interface LalSattiRosterEntry {
  readonly id: string;
  readonly name: string;
  readonly avatarInitial: string;
  readonly isBot: boolean;
}

const BOT_NAMES = [
  { name: 'Ba', avatarInitial: 'B' },
  { name: 'Kaka', avatarInitial: 'K' },
  { name: 'Krina', avatarInitial: 'K' },
  { name: 'Dada', avatarInitial: 'D' },
  { name: 'Masi', avatarInitial: 'M' },
];

export function buildLalSattiRoster(playerCount: number): readonly LalSattiRosterEntry[] {
  const bots = BOT_NAMES.slice(0, Math.max(1, playerCount - 1)).map((bot, index) => ({
    id: `bot-${index + 1}`,
    name: bot.name,
    avatarInitial: bot.avatarInitial,
    isBot: true,
  }));

  return [{ id: LAL_SATTI_HUMAN_ID, name: '', avatarInitial: 'Y', isBot: false }, ...bots];
}

export function rosterName(roster: readonly LalSattiRosterEntry[], playerId: string): string {
  return roster.find((entry) => entry.id === playerId)?.name ?? playerId;
}
