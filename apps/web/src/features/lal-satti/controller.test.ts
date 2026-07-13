import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import {
  createLalSattiController,
  selectLalSattiViewState,
  type LalSattiController,
} from './controller';
import type { LalSattiControllerState } from './types';

function startedController(seed = 2) {
  const controller = createLalSattiController(seededRng(seed));
  const named = controller.dispatch(controller.initialState, {
    type: 'setHumanName',
    humanName: 'Isha',
  });
  const state = controller.dispatch(named, { type: 'start' });
  return { controller, state };
}

function advanceToHumanTurn(
  controller: LalSattiController,
  state: LalSattiControllerState,
): LalSattiControllerState {
  let current = state;
  for (let step = 0; step < 80; step += 1) {
    const view = selectLalSattiViewState(current);
    if (view.phase === 'playing' && view.isHumanTurn && view.playableCardIds.length > 0) {
      return current;
    }
    current = controller.dispatch(current, { type: 'botStep' });
  }
  throw new Error('HUMAN_TURN_NOT_REACHED');
}

function finishRound(
  controller: LalSattiController,
  state: LalSattiControllerState,
): LalSattiControllerState {
  let current = state;
  for (let step = 0; step < 300; step += 1) {
    const view = selectLalSattiViewState(current);
    if (view.phase === 'result') return current;

    if (view.isHumanTurn) {
      current =
        view.playableCardIds.length > 0
          ? controller.dispatch(current, { type: 'playCard', cardId: view.playableCardIds[0]! })
          : controller.dispatch(current, { type: 'pass' });
    } else {
      current = controller.dispatch(current, { type: 'botStep' });
    }
  }
  throw new Error('ROUND_NOT_FINISHED');
}

describe('Lal Satti web controller', () => {
  it('starts a computer game with public tableau lanes and a private human hand', () => {
    const { state } = startedController();
    const view = selectLalSattiViewState(state);

    expect(view.phase).toBe('playing');
    expect(view.lanes).toHaveLength(4);
    expect(view.lanes.every((lane) => lane.cards.length === 0)).toBe(true);
    expect(state.game?.players.flatMap((player) => player.hand)).toHaveLength(52);
    expect(
      state.game?.players
        .flatMap((player) => player.hand)
        .filter((card) => card.rank === '7')
        .map((card) => card.id)
        .sort(),
    ).toEqual(['clubs-7', 'diamonds-7', 'hearts-7', 'spades-7']);
    expect(view.events[0]?.messageKey).toBe('lalSatti.eventStarted');
  });

  it('applies a human legal play through the engine boundary', () => {
    const { controller, state: started } = startedController(4);
    const state = advanceToHumanTurn(controller, started);
    const view = selectLalSattiViewState(state);
    const cardId = view.playableCardIds[0];

    expect(cardId).toBeDefined();

    const next = controller.dispatch(state, { type: 'playCard', cardId: cardId! });
    const nextView = selectLalSattiViewState(next);

    expect(next.game?.stateVersion).toBe((state.game?.stateVersion ?? 0) + 1);
    expect(nextView.ownHand.some((card) => card.id === cardId)).toBe(false);
    expect(nextView.events[0]?.messageKey).toBe('lalSatti.eventYouPlayed');
  });

  it('lets a computer player continue when it is their turn', () => {
    const { controller, state } = startedController(4);
    const afterBot = controller.dispatch(state, { type: 'botStep' });

    expect(afterBot.game?.stateVersion).toBe(1);
    expect(afterBot.events[0]?.messageKey).toBe('lalSatti.eventCardPlayed');
  });

  it('requires a table name before starting', () => {
    const controller = createLalSattiController(seededRng(2));
    const unnamed = controller.dispatch(controller.initialState, { type: 'start' });
    const named = controller.dispatch(controller.initialState, {
      type: 'setHumanName',
      humanName: '  Isha   Bhatt  ',
    });
    const started = controller.dispatch(named, { type: 'start' });

    expect(selectLalSattiViewState(unnamed).phase).toBe('setup');
    expect(selectLalSattiViewState(named).canStart).toBe(true);
    expect(selectLalSattiViewState(started).phase).toBe('playing');
    expect(selectLalSattiViewState(started).seats[0]?.name).toBe('Isha Bhatt');
  });

  it('records leftover cards and running totals when a round finishes', () => {
    const { controller, state } = startedController(5);
    const result = finishRound(controller, state);
    const view = selectLalSattiViewState(result);

    expect(view.phase).toBe('result');
    expect(view.roundScores).toHaveLength(1);
    expect(view.roundScores[0]?.winnerNames).toHaveLength(1);
    expect(view.roundScores[0]?.leftovers.length).toBeGreaterThan(0);
    expect(view.roundScores[0]?.leftovers.every((leftover) => leftover.cardCount > 0)).toBe(true);
    expect(view.runningScores.reduce((total, score) => total + score.totalLeftoverCards, 0)).toBe(
      view.roundScores[0]?.leftovers.reduce((total, leftover) => total + leftover.cardCount, 0),
    );
  });
});
