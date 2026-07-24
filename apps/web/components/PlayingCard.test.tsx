import { cardId, type Card, type Rank, type Suit } from '@lazy-patta/game-contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlayingCard } from './PlayingCard';

function card(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

const HEARTS = card('hearts', 'jack');

describe('PlayingCard', () => {
  it('exposes a single accessible name and hides the decorative glyphs', () => {
    render(<PlayingCard card={HEARTS} label="Jack of hearts" />);
    expect(screen.getByRole('img', { name: 'Jack of hearts' })).toBeVisible();
  });

  it('renders per-suit letters (both corners) for the colour-blind aid', () => {
    const { container } = render(<PlayingCard card={HEARTS} />);
    const letters = container.querySelectorAll('.lp-suit-letter');
    // One per corner; the CSS hides them until the reader opts in.
    expect(letters.length).toBe(2);
    letters.forEach((node) => expect(node.textContent).toBe('H'));
  });

  it('uses the right initial for each suit', () => {
    const cases: ReadonlyArray<readonly [Suit, string]> = [
      ['clubs', 'C'],
      ['diamonds', 'D'],
      ['hearts', 'H'],
      ['spades', 'S'],
    ];
    for (const [suit, letter] of cases) {
      const { container } = render(<PlayingCard card={card(suit, 'ace')} />);
      const node = container.querySelector('.lp-suit-letter');
      expect(node?.textContent).toBe(letter);
    }
  });

  it('renders a face-down card with an accessible label and no suit letters', () => {
    const { container } = render(<PlayingCard faceDown label="Face-down card" />);
    expect(screen.getByRole('img', { name: 'Face-down card' })).toBeVisible();
    expect(container.querySelectorAll('.lp-suit-letter').length).toBe(0);
  });
});
