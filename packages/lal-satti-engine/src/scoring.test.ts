import { cardId, type Card, type Rank, type Suit } from '@lazy-patta/game-contracts';
import { describe, expect, it } from 'vitest';

import { lalSattiCardPoints, lalSattiHandPoints } from './scoring';

function card(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

describe('Lal Satti scoring', () => {
  it('scores each rank by its face value with ace low', () => {
    expect(
      ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'].map((rank) =>
        lalSattiCardPoints(card('hearts', rank as Rank)),
      ),
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it('sums a leftover hand by rank value', () => {
    expect(
      lalSattiHandPoints([
        card('hearts', 'ace'),
        card('clubs', '10'),
        card('spades', 'queen'),
        card('diamonds', 'king'),
      ]),
    ).toBe(36);
  });
});
