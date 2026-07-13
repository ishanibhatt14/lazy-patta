import { cardId, SUITS, type Card, type Rank, type Suit } from '@lazy-patta/game-contracts';

import { LAL_SATTI_RANKS, rankIndex, sortCards } from './cards';
import type { LalSattiRulePack, LalSattiTableau, LalSattiTableauLane } from './types';

export const LAL_SATTI_CLASSIC: LalSattiRulePack = {
  id: 'lal-satti-classic-seven-of-hearts',
  minPlayers: 2,
  maxPlayers: 6,
  opening: 'classic-seven-of-hearts',
  passRule: 'blocked-only',
  blockedCycle: 'invariant-error',
  scoring: 'rank-value',
};

export const LAL_SATTI_ALL_SEVENS_OPEN: LalSattiRulePack = {
  id: 'lal-satti-all-sevens-open',
  minPlayers: 2,
  maxPlayers: 6,
  opening: 'all-sevens-open',
  passRule: 'blocked-only',
  blockedCycle: 'invariant-error',
  scoring: 'rank-value',
};

export function createEmptyTableau(): LalSattiTableau {
  return {
    clubs: [],
    diamonds: [],
    hearts: [],
    spades: [],
  };
}

export function createAllSevensTableau(): LalSattiTableau {
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
  if (lane.length === 0) return card.rank === '7';

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
  if (tableau[suit].length === 0) return ['7'];

  const { low, high } = laneBounds(tableau[suit]);
  const ranks: Rank[] = [];
  if (low > 0) ranks.push(LAL_SATTI_RANKS[low - 1]!);
  if (high < LAL_SATTI_RANKS.length - 1) ranks.push(LAL_SATTI_RANKS[high + 1]!);
  return ranks;
}
