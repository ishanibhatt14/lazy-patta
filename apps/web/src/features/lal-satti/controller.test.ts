import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { createLalSattiController, selectLalSattiViewState } from './controller';

function startedController(seed = 2) {
  const controller = createLalSattiController(seededRng(seed));
  const state = controller.dispatch(controller.initialState, { type: 'start' });
  return { controller, state };
}

describe('Lal Satti web controller', () => {
  it('starts a computer game with public tableau lanes and a private human hand', () => {
    const { state } = startedController();
    const view = selectLalSattiViewState(state);

    expect(view.phase).toBe('playing');
    expect(view.lanes).toHaveLength(4);
    expect(view.lanes.every((lane) => lane.cards.some((card) => card.rank === '7'))).toBe(true);
    expect(view.ownHand.every((card) => card.rank !== '7')).toBe(true);
    expect(view.events[0]?.messageKey).toBe('lalSatti.eventStarted');
  });

  it('applies a human legal play through the engine boundary', () => {
    const { controller, state } = startedController(4);
    const view = selectLalSattiViewState(state);
    const cardId = view.playableCardIds[0];

    expect(cardId).toBeDefined();

    const next = controller.dispatch(state, { type: 'playCard', cardId: cardId! });
    const nextView = selectLalSattiViewState(next);

    expect(next.game?.stateVersion).toBe(1);
    expect(nextView.ownHand.some((card) => card.id === cardId)).toBe(false);
    expect(nextView.events[0]?.messageKey).toBe('lalSatti.eventYouPlayed');
  });

  it('lets a computer player continue when it is their turn', () => {
    const { controller, state } = startedController(4);
    const firstPlayable = selectLalSattiViewState(state).playableCardIds[0]!;
    const afterHuman = controller.dispatch(state, { type: 'playCard', cardId: firstPlayable });
    const afterBot = controller.dispatch(afterHuman, { type: 'botStep' });

    expect(afterBot.game?.stateVersion).toBe(2);
    expect(afterBot.events[0]?.messageKey).toMatch(/^lalSatti\.event(CardPlayed|Passed|Result)$/);
  });
});
