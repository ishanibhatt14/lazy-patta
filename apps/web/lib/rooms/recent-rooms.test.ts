import { beforeEach, describe, expect, it } from 'vitest';

import { readRecentRooms, rememberRecentRoom, removeRecentRoom } from './recent-rooms';

describe('recent rooms', () => {
  beforeEach(() => window.localStorage.clear());

  it('stores only safe room references', () => {
    rememberRecentRoom({ roomCode: 'lp57ab', gameSlug: 'gadha-chor', tableName: 'Sunday' });
    expect(readRecentRooms()).toEqual([
      expect.objectContaining({
        roomCode: 'LP57AB',
        gameSlug: 'gadha-chor',
        tableName: 'Sunday',
      }),
    ]);
    expect(JSON.stringify(readRecentRooms())).not.toContain('token');
  });

  it('removes expired or unwanted references after confirmation', () => {
    rememberRecentRoom({ roomCode: 'LP57AB', gameSlug: 'gadha-chor' });
    removeRecentRoom('lp57ab');
    expect(readRecentRooms()).toHaveLength(0);
  });
});
