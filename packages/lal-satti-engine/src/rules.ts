import { cardId, RANKS, SUITS, type Card, type Rank, type Suit } from '@lazy-patta/game-contracts';

import { rankIndex, sortCards } from './cards';
import type { LalSattiRulePack, LalSattiTableau, LalSattiTableauLane } from './types';

export const LAL_SATTI_CLASSIC: LalSattiRulePack = {
  id: 'lal-satti-classic',
  minPlayers: 2,
  maxPlayers: 6,
  opening: 'all-sevens',
  passRule: 'blocked-only',
  scoring: 'win-only',
};

export function createOpeningTableau(): LalSattiTableau {
  return {
    clubs: [{ id: cardId('clubs', '7'), suit: 'clubs', rank: '7' }],
    diamonds: [{ id: cardId('diamonds', '7'), suit: 'diamonds', rank: '7' }],
    hearts: [{ id: cardId('hearts', '7'), suit: 'hearts', rank: '7' }],
    spades: [{ id: cardId('spades', '7'), suit: 'spades', rank: '7' }],
  };
}

function laneBounds(cards: readonly Card[]): { low: number; high: number } {
  const indexes = cards.map((card) => rankIndex(card.rank));
  return { low: Math.min(...indexes), high: Math.max(...indexes) };
}

export function isLegalTableauPlay(tableau: LalSattiTableau, card: Card): boolean {
  const lane = tableau[card.suit];
  if (lane.some((played) => played.id === card.id)) return false;

  const value = rankIndex(card.rank);
  const { low, high } = laneBounds(lane);
  return value === low - 1 || value === high + 1;
}

export function addCardToTableau(tableau: LalSattiTableau, card: Card): LalSattiTableau {
  return {
    ...tableau,
    [card.suit]: sortCards([...tableau[card.suit], card]),
  };
}

export function playableCards(tableau: LalSattiTableau, hand: readonly Card[]): readonly Card[] {
  return sortCards(hand.filter((card) => isLegalTableauPlay(tableau, card)));
}

export function toTableauLanes(tableau: LalSattiTableau): readonly LalSattiTableauLane[] {
  return SUITS.map((suit) => {
    const cards = sortCards(tableau[suit]);
    const low = cards[0]?.rank ?? '7';
    const high = cards[cards.length - 1]?.rank ?? '7';
    return { suit, cards, lowRank: low, highRank: high };
  });
}

export function nextNeededRanks(tableau: LalSattiTableau, suit: Suit): readonly Rank[] {
  const { low, high } = laneBounds(tableau[suit]);
  const ranks: Rank[] = [];
  if (low > 0) ranks.push(RANKS[low - 1]!);
  if (high < RANKS.length - 1) ranks.push(RANKS[high + 1]!);
  return ranks;
}
