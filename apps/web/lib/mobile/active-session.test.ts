import { afterEach, describe, expect, it } from 'vitest';

import {
  clearActiveSession,
  readActiveSessionPointer,
  rememberActiveSession,
  resolveActiveSession,
} from './active-session';
import { computerGameSessions, type ComputerGameConfig } from './computer-session';

const config: ComputerGameConfig = {
  gameSlug: 'lal-satti',
  humanName: 'Nani',
  playerCount: 4,
  difficulty: 'medium',
  reducedMotion: false,
  confirmBeforePlay: false,
};

afterEach(() => {
  window.localStorage.clear();
});

describe('active-session pointer', () => {
  it('round-trips a pointer', () => {
    rememberActiveSession({ gameSlug: 'lal-satti', sessionId: 's1' });
    expect(readActiveSessionPointer()).toEqual({ gameSlug: 'lal-satti', sessionId: 's1' });
  });

  it('rejects a pointer to an unknown game', () => {
    window.localStorage.setItem(
      'lazy-patta:mobile-active-session:v1',
      JSON.stringify({ gameSlug: 'poker', sessionId: 's1' }),
    );
    expect(readActiveSessionPointer()).toBeNull();
  });

  it('resolves to the pointer when the session is live', async () => {
    const session = await computerGameSessions.create(config);
    rememberActiveSession({ gameSlug: 'lal-satti', sessionId: session.sessionId });
    expect(await resolveActiveSession()).toEqual({
      gameSlug: 'lal-satti',
      sessionId: session.sessionId,
    });
  });

  it('clears a pointer whose session no longer exists', async () => {
    rememberActiveSession({ gameSlug: 'lal-satti', sessionId: 'gone' });
    expect(await resolveActiveSession()).toBeNull();
    expect(readActiveSessionPointer()).toBeNull();
  });

  it('clears a pointer whose session was abandoned', async () => {
    const session = await computerGameSessions.create(config);
    await computerGameSessions.save({ ...session, status: 'abandoned' });
    rememberActiveSession({ gameSlug: 'lal-satti', sessionId: session.sessionId });
    expect(await resolveActiveSession()).toBeNull();
  });

  it('clear removes the pointer', () => {
    rememberActiveSession({ gameSlug: 'lal-satti', sessionId: 's1' });
    clearActiveSession();
    expect(readActiveSessionPointer()).toBeNull();
  });
});
