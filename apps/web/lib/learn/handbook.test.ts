import { describe, expect, it } from 'vitest';

import { filterHandbook, matchesHandbookFilter, type HandbookSearchable } from './handbook';

const gadha: HandbookSearchable = { difficulty: 'easy', text: 'Gadha Chor Gulaam Chor Jack Thief' };
const kachuful: HandbookSearchable = { difficulty: 'strategy', text: 'Kachuful Judgement' };
const jhabbu: HandbookSearchable = { difficulty: 'fast', text: 'Jhabbu Bhabhi Get Away' };
const shelf = [gadha, kachuful, jhabbu];

describe('matchesHandbookFilter', () => {
  it('keeps everything with an empty query and the "all" chip', () => {
    expect(matchesHandbookFilter(gadha, '', 'all')).toBe(true);
    expect(matchesHandbookFilter(kachuful, '   ', 'all')).toBe(true);
  });

  it('matches a regional/alternate name case-insensitively', () => {
    expect(matchesHandbookFilter(gadha, 'gulaam', 'all')).toBe(true);
    expect(matchesHandbookFilter(kachuful, 'JUDGEMENT', 'all')).toBe(true);
  });

  it('rejects a query the text does not contain', () => {
    expect(matchesHandbookFilter(gadha, 'rummy', 'all')).toBe(false);
  });

  it('applies the difficulty chip', () => {
    expect(matchesHandbookFilter(gadha, '', 'easy')).toBe(true);
    expect(matchesHandbookFilter(gadha, '', 'strategy')).toBe(false);
  });

  it('requires both the query and the chip to pass', () => {
    // Right difficulty, wrong text.
    expect(matchesHandbookFilter(kachuful, 'gadha', 'strategy')).toBe(false);
    // Right text, wrong difficulty.
    expect(matchesHandbookFilter(kachuful, 'judgement', 'fast')).toBe(false);
    // Both right.
    expect(matchesHandbookFilter(kachuful, 'judgement', 'strategy')).toBe(true);
  });
});

describe('filterHandbook', () => {
  it('returns the whole shelf for an empty query on "all"', () => {
    expect(filterHandbook(shelf, '', 'all')).toEqual(shelf);
  });

  it('narrows to a single game by alternate name', () => {
    expect(filterHandbook(shelf, 'get away', 'all')).toEqual([jhabbu]);
  });

  it('narrows by difficulty chip', () => {
    expect(filterHandbook(shelf, '', 'strategy')).toEqual([kachuful]);
  });

  it('returns an empty shelf when nothing matches', () => {
    expect(filterHandbook(shelf, 'poker', 'all')).toEqual([]);
  });
});
