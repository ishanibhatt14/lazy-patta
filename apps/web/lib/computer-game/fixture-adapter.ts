import type { Card, Rank, Suit } from '@lazy-patta/game-contracts';
import { cardId } from '@lazy-patta/game-contracts';

import type {
  ComputerGameSeat,
  ComputerGameSettings,
  ComputerGameViewEvent,
  HiddenCardSlot,
  PairAnimation,
} from './types';

interface FixtureBot {
  readonly id: string;
  readonly name: string;
  readonly avatarInitial: string;
  readonly position: 'top' | 'left' | 'right';
}

const BOTS: readonly FixtureBot[] = [
  { id: 'ba', name: 'Ba', avatarInitial: 'B', position: 'top' },
  { id: 'kaki', name: 'Kaki', avatarInitial: 'K', position: 'left' },
  { id: 'ravi', name: 'Ravi', avatarInitial: 'R', position: 'right' },
  { id: 'meera', name: 'Meera', avatarInitial: 'M', position: 'top' },
];

function fixtureCard(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

export const HUMAN_STARTING_HAND: readonly Card[] = [
  fixtureCard('hearts', 'ace'),
  fixtureCard('clubs', '7'),
  fixtureCard('diamonds', 'queen'),
  fixtureCard('spades', '9'),
];

export const HUMAN_AFTER_PAIR_HAND: readonly Card[] = [
  fixtureCard('clubs', '7'),
  fixtureCard('diamonds', 'queen'),
  fixtureCard('spades', '9'),
];

const DRAWN_PAIR: PairAnimation = {
  drawnCard: fixtureCard('spades', 'ace'),
  matchedCard: fixtureCard('hearts', 'ace'),
  captionKey: 'game.jodiMaliGai',
};

export function botPreview(count: number): readonly FixtureBot[] {
  return BOTS.slice(0, Math.max(1, count - 1));
}

export function seatsForPhase(
  settings: ComputerGameSettings,
  phase:
    | 'setup'
    | 'dealing'
    | 'initialPairs'
    | 'humanTurn'
    | 'botTurn'
    | 'pairFound'
    | 'playerFinished'
    | 'result'
    | 'error',
): readonly ComputerGameSeat[] {
  const humanCards =
    phase === 'pairFound' || phase === 'botTurn' || phase === 'playerFinished' || phase === 'result'
      ? 3
      : 4;
  const bots = botPreview(settings.playerCount);
  const activeId =
    phase === 'humanTurn' || phase === 'pairFound'
      ? 'you'
      : phase === 'botTurn' || phase === 'playerFinished'
        ? bots[0]?.id
        : undefined;

  return [
    {
      id: 'you',
      name: 'Ishani',
      avatarInitial: 'I',
      cardCount: humanCards,
      isSelf: true,
      isActive: activeId === 'you',
      isFinished: false,
      position: 'bottom',
    },
    ...bots.map((bot, index) => ({
      id: bot.id,
      name: bot.name,
      avatarInitial: bot.avatarInitial,
      cardCount: phase === 'playerFinished' && index === 0 ? 0 : 4 - (index % 2),
      isSelf: false,
      isActive: activeId === bot.id,
      isFinished: phase === 'playerFinished' && index === 0,
      position: bot.position,
    })),
  ];
}

export function hiddenCardsFor(
  settings: ComputerGameSettings,
  selectable: boolean,
): readonly HiddenCardSlot[] {
  const [firstBot] = botPreview(settings.playerCount);
  if (!firstBot) {
    return [];
  }

  return [0, 1, 2, 3].map((index) => ({
    ownerId: firstBot.id,
    ownerName: firstBot.name,
    positionToken: `${firstBot.id}-slot-${index + 1}`,
    displayIndex: index + 1,
    isSelectable: selectable,
  }));
}

export function scriptedPair(): PairAnimation {
  return DRAWN_PAIR;
}

export function event(
  id: string,
  type: ComputerGameViewEvent['type'],
  messageKey: ComputerGameViewEvent['messageKey'],
  playerName?: string,
): ComputerGameViewEvent {
  return { id, type, messageKey, playerName };
}
