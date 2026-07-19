import type { PlayerId } from '@lazy-patta/game-contracts';

import { MAX_TABLE_SIZE, MIN_TABLE_SIZE } from './rule-pack';
import type { SeatPosition } from './types';

export const HUMAN_ID = 'you';

export interface RosterEntry {
  readonly id: PlayerId;
  /** Proper-noun display name for bots; empty for the human (rendered as a
   * localized "You"). Bot names are locale-independent, never concatenated. */
  readonly name: string;
  readonly avatarInitial: string;
  readonly isSelf: boolean;
  readonly position: SeatPosition;
}

/**
 * Warm family "table" — proper nouns, not translated copy. Names stay Latin in
 * every locale, so the avatar initial is the Latin first letter to match (a
 * Gujarati-script glyph looked wrong next to the Latin name in en/hi mode).
 */
const BOT_ROSTER: readonly { id: string; name: string; avatarInitial: string }[] = [
  { id: 'ba', name: 'Ba', avatarInitial: 'B' },
  { id: 'kaka', name: 'Kaka', avatarInitial: 'K' },
  { id: 'masi', name: 'Masi', avatarInitial: 'M' },
  { id: 'mama', name: 'Mama', avatarInitial: 'M' },
  { id: 'kaki', name: 'Kaki', avatarInitial: 'K' },
];

/**
 * Where each opponent sits around the felt for a given opponent count, so the
 * table stays visually balanced from 1 to 5 bots. The human is always `bottom`.
 */
const OPPONENT_LAYOUT: Record<number, readonly SeatPosition[]> = {
  1: ['top'],
  2: ['left', 'right'],
  3: ['left', 'top', 'right'],
  4: ['left', 'top', 'top', 'right'],
  5: ['left', 'top', 'top', 'top', 'right'],
};

export function clampPlayerCount(count: number): number {
  if (Number.isNaN(count)) return MIN_TABLE_SIZE;
  return Math.min(MAX_TABLE_SIZE, Math.max(MIN_TABLE_SIZE, Math.round(count)));
}

/**
 * Build the seating roster for `playerCount` total seats (human + bots). The
 * array order is the turn order handed to the engine: the human is index 0, so
 * play begins with the human and proceeds clockwise through the bots.
 */
export function buildRoster(playerCount: number): readonly RosterEntry[] {
  const total = clampPlayerCount(playerCount);
  const botCount = total - 1;
  const layout = OPPONENT_LAYOUT[botCount] ?? OPPONENT_LAYOUT[1]!;

  const human: RosterEntry = {
    id: HUMAN_ID,
    name: '',
    avatarInitial: '★',
    isSelf: true,
    position: 'bottom',
  };

  const bots: RosterEntry[] = BOT_ROSTER.slice(0, botCount).map((bot, index) => ({
    id: bot.id,
    name: bot.name,
    avatarInitial: bot.avatarInitial,
    isSelf: false,
    position: layout[index] ?? 'top',
  }));

  return [human, ...bots];
}

export function rosterName(roster: readonly RosterEntry[], id: PlayerId): string {
  return roster.find((entry) => entry.id === id)?.name ?? '';
}

export function isSelf(id: PlayerId): boolean {
  return id === HUMAN_ID;
}
