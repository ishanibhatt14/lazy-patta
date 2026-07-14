export const JHABBU_HUMAN_ID = 'you';

export interface JhabbuRosterEntry {
  readonly id: string;
  readonly nameKey:
    'jhabbu.botBa' | 'jhabbu.botKaka' | 'jhabbu.botKrina' | 'jhabbu.botDada' | 'jhabbu.botMasi';
  readonly avatarInitial: string;
  readonly isBot: boolean;
}

const BOT_ROSTER: readonly JhabbuRosterEntry[] = [
  { id: 'bot-ba', nameKey: 'jhabbu.botBa', avatarInitial: 'B', isBot: true },
  { id: 'bot-kaka', nameKey: 'jhabbu.botKaka', avatarInitial: 'K', isBot: true },
  { id: 'bot-krina', nameKey: 'jhabbu.botKrina', avatarInitial: 'K', isBot: true },
  { id: 'bot-dada', nameKey: 'jhabbu.botDada', avatarInitial: 'D', isBot: true },
  { id: 'bot-masi', nameKey: 'jhabbu.botMasi', avatarInitial: 'M', isBot: true },
];

export function buildJhabbuRoster(playerCount: number): readonly JhabbuRosterEntry[] {
  return [
    { id: JHABBU_HUMAN_ID, nameKey: 'jhabbu.botBa', avatarInitial: 'Y', isBot: false },
    ...BOT_ROSTER.slice(0, Math.max(0, playerCount - 1)),
  ];
}
