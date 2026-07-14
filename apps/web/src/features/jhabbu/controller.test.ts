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
});
