import { describe, expect, it } from 'vitest';

import type { ComputerGameConfig } from './computer-session';
import { transitionGameFlow, type MobileGameFlowState } from './game-flow';
import { GAME_REGISTRY } from './game-registry';

const config: ComputerGameConfig = {
  gameSlug: 'lal-satti',
  humanName: 'Aanya',
  playerCount: 4,
  difficulty: 'medium',
  reducedMotion: false,
  confirmBeforePlay: false,
};

describe('transitionGameFlow', () => {
  it('walks the canonical computer flow', () => {
    let state: MobileGameFlowState = { status: 'idle' };
    state = transitionGameFlow(state, { type: 'GAME_SELECTED', gameSlug: 'lal-satti' });
    expect(state).toEqual({ status: 'selecting-mode', gameSlug: 'lal-satti' });

    state = transitionGameFlow(state, { type: 'MODE_SELECTED', mode: 'computer' });
    expect(state).toEqual({ status: 'configuring', gameSlug: 'lal-satti', mode: 'computer' });

    state = transitionGameFlow(state, {
      type: 'CONFIG_CONFIRMED',
      config,
      requestId: 'req-1',
    });
    expect(state).toEqual({
      status: 'initializing',
      gameSlug: 'lal-satti',
      mode: 'computer',
      requestId: 'req-1',
    });

    state = transitionGameFlow(state, { type: 'INITIALIZATION_SUCCEEDED', sessionId: 's1' });
    expect(state).toEqual({
      status: 'playing',
      gameSlug: 'lal-satti',
      mode: 'computer',
      sessionId: 's1',
    });

    state = transitionGameFlow(state, { type: 'ROUND_COMPLETED', roundId: 'r1' });
    expect(state.status).toBe('round-complete');

    state = transitionGameFlow(state, { type: 'PLAY_AGAIN_REQUESTED', requestId: 'req-2' });
    expect(state.status).toBe('starting-next-round');

    state = transitionGameFlow(state, { type: 'NEXT_ROUND_STARTED', sessionId: 's2' });
    expect(state).toEqual({
      status: 'playing',
      gameSlug: 'lal-satti',
      mode: 'computer',
      sessionId: 's2',
    });
  });

  it('rejects impossible transitions with a recoverable error', () => {
    const state = transitionGameFlow(
      { status: 'idle' },
      { type: 'INITIALIZATION_SUCCEEDED', sessionId: 's1' },
    );

    expect(state).toMatchObject({
      status: 'error',
      recoverable: true,
      code: 'INVALID_TRANSITION',
    });
  });

  it('resumes recovery into the game that was actually interrupted', () => {
    let state: MobileGameFlowState = transitionGameFlow(
      { status: 'idle' },
      { type: 'RECOVERY_STARTED', gameSlug: 'kachuful', sessionId: 's7' },
    );
    expect(state).toMatchObject({ status: 'recovering', gameSlug: 'kachuful', sessionId: 's7' });

    state = transitionGameFlow(state, {
      type: 'RECOVERY_SUCCEEDED',
      gameSlug: 'kachuful',
      sessionId: 's7',
    });
    expect(state).toEqual({
      status: 'playing',
      gameSlug: 'kachuful',
      mode: 'computer',
      sessionId: 's7',
    });
  });

  it('uses the registry player limits as the setup source of truth', () => {
    expect(GAME_REGISTRY['gadha-chor'].players).toMatchObject({ min: 2, max: 6 });
    expect(GAME_REGISTRY['lal-satti'].players).toMatchObject({ min: 3, max: 6 });
    expect(GAME_REGISTRY.jhabbu.players).toMatchObject({ min: 3, max: 6 });
    expect(GAME_REGISTRY.kachuful.players).toMatchObject({ min: 3, max: 7 });
  });
});
