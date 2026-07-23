import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { createComputerGameController, type ControllerState } from './controller';
import { HUMAN_ID } from './players';
import { selectViewState } from './view-model';

function drive(playerCount: number, seed: number): ControllerState {
  const controller = createComputerGameController(seededRng(seed), {
    playerCount,
    locale: 'en',
    reducedMotion: false,
    soundEnabled: true,
  });

  let state = controller.dispatch(controller.initialState, { type: 'start' });
  // Deal → initial pairs → play, driven the way the view effects would.
  state = controller.dispatch(state, { type: 'introAdvance' });
  state = controller.dispatch(state, { type: 'introAdvance' });

  // Bounded loop so a logic regression can never hang the suite.
  for (let guard = 0; guard < 500 && state.phase === 'playing'; guard += 1) {
    if (state.draw) {
      state = controller.dispatch(state, { type: 'clearDraw' });
      continue;
    }
    const view = selectViewState(state);
    if (view.currentTurn.isSelf) {
      const token = view.hiddenCards[0]?.positionToken;
      expect(token).toBeDefined();
      state = controller.dispatch(state, { type: 'chooseHiddenCard', positionToken: token! });
    } else {
      state = controller.dispatch(state, { type: 'botStep' });
    }
  }
  return state;
}

describe('computer game controller', () => {
  it('starts a game and enters the dealing phase', () => {
    const controller = createComputerGameController(seededRng(1));
    const started = controller.dispatch(controller.initialState, { type: 'start' });
    expect(started.phase).toBe('dealing');
    expect(started.game).not.toBeNull();
  });

  it('clamps the player count to the 2–6 table range', () => {
    const controller = createComputerGameController(seededRng(1));
    const tooFew = controller.dispatch(controller.initialState, {
      type: 'setPlayerCount',
      playerCount: 1,
    });
    const tooMany = controller.dispatch(controller.initialState, {
      type: 'setPlayerCount',
      playerCount: 9,
    });
    expect(tooFew.settings.playerCount).toBe(2);
    expect(tooMany.settings.playerCount).toBe(6);
  });

  it.each([2, 3, 4, 5, 6])(
    'plays a full deterministic %i-player game to exactly one Gadha Chor',
    (playerCount) => {
      const state = drive(playerCount, playerCount * 7 + 3);
      expect(state.phase).toBe('result');
      const view = selectViewState(state);
      expect(view.result).toBeDefined();
      // Exactly one Gadha Chor; everyone else is a winner.
      expect(view.result!.winnerNames).toHaveLength(playerCount - 1);
      expect(view.result!.gadhaChorIsSelf || view.result!.gadhaChorName.length > 0).toBe(true);
    },
  );

  it('returns to setup on recover after an error', () => {
    const controller = createComputerGameController(seededRng(1));
    const errored: ControllerState = {
      ...controller.initialState,
      phase: 'error',
      recoverableError: true,
    };
    const recovered = controller.dispatch(errored, { type: 'recover' });
    expect(recovered.phase).toBe('setup');
    expect(recovered.recoverableError).toBe(false);
  });

  it('rematches from a finished round back into a fresh deal', () => {
    const finished = drive(3, 99);
    const controller = createComputerGameController(seededRng(99), finished.settings);
    const again = controller.dispatch(finished, { type: 'rematch' });
    expect(again.phase).toBe('dealing');
    expect(again.game).not.toBeNull();
    void controller;
  });

  it('folds each finished game into the family series exactly once', () => {
    const finished = drive(3, 99);
    // One game played; every safe player (all but the Gadha Chor) is credited.
    expect(finished.series.gamesPlayed).toBe(1);
    const totalWins = Object.values(finished.series.winsByName).reduce((sum, n) => sum + n, 0);
    expect(totalWins).toBe(2);
  });

  it('carries the family series across a rematch', () => {
    const finished = drive(3, 99);
    const controller = createComputerGameController(seededRng(99), finished.settings);
    const again = controller.dispatch(finished, { type: 'rematch' });
    expect(again.series).toEqual(finished.series);
  });

  it('ignores an unknown position token instead of crashing', () => {
    const controller = createComputerGameController(seededRng(5));
    let state = controller.dispatch(controller.initialState, { type: 'start' });
    state = controller.dispatch(state, { type: 'introAdvance' });
    state = controller.dispatch(state, { type: 'introAdvance' });
    const before = state;
    const after = controller.dispatch(state, {
      type: 'chooseHiddenCard',
      positionToken: 'not-a-real-token',
    });
    expect(after).toBe(before);
  });

  it('never leaks an opponent hand or card identity into the view', () => {
    // Sample the view at every step of a full game; opponent surfaces (seats,
    // hidden slots, and bot draws) must never carry a card identity.
    const controller = createComputerGameController(seededRng(123), {
      playerCount: 4,
      locale: 'en',
      reducedMotion: false,
      soundEnabled: true,
    });
    let state = controller.dispatch(controller.initialState, { type: 'start' });
    state = controller.dispatch(state, { type: 'introAdvance' });
    state = controller.dispatch(state, { type: 'introAdvance' });

    for (let guard = 0; guard < 500 && state.phase === 'playing'; guard += 1) {
      const view = selectViewState(state);

      for (const seat of view.seats) {
        if (seat.id === HUMAN_ID) continue;
        expect('hand' in seat).toBe(false);
        expect(typeof seat.cardCount).toBe('number');
      }
      // Opaque tokens only — never rank/suit.
      const hiddenJson = JSON.stringify(view.hiddenCards);
      expect(hiddenJson).not.toContain('"rank"');
      expect(hiddenJson).not.toContain('"suit"');
      // A bot's resolved draw carries no card identity for the viewer.
      if (view.draw && !view.draw.actorIsSelf) {
        expect(view.draw.drawnCard).toBeUndefined();
        expect(view.draw.matchedCard).toBeUndefined();
      }

      if (state.draw) {
        state = controller.dispatch(state, { type: 'clearDraw' });
        continue;
      }
      if (view.currentTurn.isSelf) {
        state = controller.dispatch(state, {
          type: 'chooseHiddenCard',
          positionToken: view.hiddenCards[0]!.positionToken,
        });
      } else {
        state = controller.dispatch(state, { type: 'botStep' });
      }
    }
    expect(state.phase).toBe('result');
  });
});
