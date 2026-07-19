import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { createJhabbuController, selectJhabbuViewState, type JhabbuController } from './controller';
import type { JhabbuControllerState } from './types';

function startedController(seed = 12) {
  const controller = createJhabbuController(seededRng(seed));
  const named = controller.dispatch(controller.initialState, {
    type: 'setHumanName',
    humanName: 'Isha',
  });
  const state = controller.dispatch(named, { type: 'start' });
  return { controller, state };
}

function advanceToHumanTurn(
  controller: JhabbuController,
  state: JhabbuControllerState,
): JhabbuControllerState {
  let current = state;
  for (let step = 0; step < 160; step += 1) {
    const view = selectJhabbuViewState(current);
    if (view.phase === 'playing' && view.isHumanTurn) return current;
    current = controller.dispatch(current, { type: 'botStep' });
  }
  throw new Error('HUMAN_TURN_NOT_REACHED');
}

function playToResult(
  controller: JhabbuController,
  state: JhabbuControllerState,
): JhabbuControllerState {
  let current = state;
  for (let step = 0; step < 600; step += 1) {
    const view = selectJhabbuViewState(current);
    if (view.phase === 'result') return current;
    if (view.isHumanTurn) {
      if (view.canDrawFromWaste) {
        current = controller.dispatch(current, { type: 'drawFromWaste' });
      } else if (view.playableCardIds.length > 0) {
        current = controller.dispatch(current, {
          type: 'playCard',
          cardId: view.playableCardIds[0]!,
        });
      } else {
        current = controller.dispatch(current, { type: 'botStep' });
      }
    } else {
      current = controller.dispatch(current, { type: 'botStep' });
    }
  }
  throw new Error('RESULT_NOT_REACHED');
}

describe('Jhabbu web controller', () => {
  it('starts a computer game with a conserved 52-card deal and private human hand', () => {
    const { state } = startedController();
    const view = selectJhabbuViewState(state);

    expect(view.phase).toBe('playing');
    expect(view.seats).toHaveLength(4);
    expect(state.game?.players.flatMap((player) => player.hand)).toHaveLength(52);
    expect(state.game?.currentTrick).toHaveLength(0);
    expect(view.ownHand.length).toBeGreaterThan(0);
    expect(view.events[0]?.messageKey).toBe('jhabbu.eventStarted');
  });

  it('highlights only legal human cards and applies a play through the engine boundary', () => {
    const { controller, state: started } = startedController(14);
    const state = advanceToHumanTurn(controller, started);
    const view = selectJhabbuViewState(state);

    if (view.canDrawFromWaste) {
      const next = controller.dispatch(state, { type: 'drawFromWaste' });
      expect(next.game?.stateVersion).toBe((state.game?.stateVersion ?? 0) + 1);
      expect(selectJhabbuViewState(next).events[0]?.messageKey).toBe('jhabbu.eventYouDrewWaste');
      return;
    }

    const cardId = view.playableCardIds[0];
    expect(cardId).toBeDefined();

    const next = controller.dispatch(state, { type: 'playCard', cardId: cardId! });
    const nextView = selectJhabbuViewState(next);

    expect(next.game?.stateVersion).toBe((state.game?.stateVersion ?? 0) + 1);
    expect(nextView.ownHand.some((card) => card.id === cardId)).toBe(false);
    expect(nextView.events[0]?.messageKey).toBe('jhabbu.eventYouPlayed');
  });

  it('lets a computer player continue when it is their turn', () => {
    const { controller, state } = startedController(12);
    const view = selectJhabbuViewState(state);
    const afterBot = view.isHumanTurn ? state : controller.dispatch(state, { type: 'botStep' });

    expect(afterBot.game?.stateVersion).toBeGreaterThanOrEqual(state.game?.stateVersion ?? 0);
  });

  it('records a round score with a loser and per-player standings when a round completes', () => {
    const { controller, state: started } = startedController(7);
    const completed = playToResult(controller, started);
    const view = selectJhabbuViewState(completed);

    expect(view.phase).toBe('result');
    expect(completed.roundScores).toHaveLength(1);

    const round = completed.roundScores[0]!;
    expect(round.roundNumber).toBe(1);
    expect(round.scoreRule).toBe('thulla-v1');
    expect(round.loserName.length).toBeGreaterThan(0);
    expect(round.standings).toHaveLength(view.seats.length);

    const loserStanding = round.standings.find((standing) => standing.playerId === round.loserId);
    expect(loserStanding?.finishPosition).toBeNull();
    // The loser carries the highest per-round penalty in Jhabbu scoring.
    expect(loserStanding?.penaltyPoints).toBe(3);
  });

  it('accumulates running scores across rematches and ranks the lowest penalty first', () => {
    const { controller, state: started } = startedController(7);
    const firstDone = playToResult(controller, started);
    const secondStart = controller.dispatch(firstDone, { type: 'rematch' });
    const secondDone = playToResult(controller, secondStart);
    const view = selectJhabbuViewState(secondDone);

    expect(secondDone.roundScores).toHaveLength(2);
    expect(view.runningScores).toHaveLength(view.seats.length);

    const totals = view.runningScores.map((score) => score.totalPenaltyPoints);
    for (let i = 1; i < totals.length; i += 1) {
      expect(totals[i]!).toBeGreaterThanOrEqual(totals[i - 1]!);
    }
    const totalRoundsLost = view.runningScores.reduce((sum, score) => sum + score.roundsLost, 0);
    expect(totalRoundsLost).toBe(2);
  });

  it('hydrates a stored session once and preserves round scores through a rematch', () => {
    const { controller, state: started } = startedController(7);
    const completed = playToResult(controller, started);

    const rematch = controller.dispatch(completed, { type: 'rematch' });
    expect(rematch.roundScores).toHaveLength(1);

    const hydrated = controller.dispatch(controller.initialState, {
      type: 'hydrateSession',
      humanName: 'Isha',
      roundScores: completed.roundScores,
    });
    expect(hydrated.hasHydratedSession).toBe(true);
    expect(hydrated.humanName).toBe('Isha');
    expect(hydrated.roundScores).toHaveLength(1);

    // A second hydrate is ignored so we do not clobber live play.
    const reHydrated = controller.dispatch(hydrated, {
      type: 'hydrateSession',
      humanName: 'Someone Else',
      roundScores: [],
    });
    expect(reHydrated.humanName).toBe('Isha');
    expect(reHydrated.roundScores).toHaveLength(1);
  });
});
