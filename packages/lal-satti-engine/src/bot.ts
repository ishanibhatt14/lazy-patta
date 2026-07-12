import type { PlayerId } from '@lazy-patta/game-contracts';

import { rankIndex } from './cards';
import { LalSattiEngine } from './engine';
import type { LalSattiAction, LalSattiState } from './types';

export type LalSattiBotStrategy = 'lowest-card' | 'shed-high';

export interface LalSattiBotDecision {
  readonly strategy: LalSattiBotStrategy;
  readonly action: LalSattiAction;
}

function actionRank(state: LalSattiState, action: LalSattiAction): number {
  if (action.type === 'PASS') return Number.POSITIVE_INFINITY;
  const actor = state.players[state.currentPlayerIndex]!;
  const card = actor.hand.find((candidate) => candidate.id === action.cardId);
  return card ? rankIndex(card.rank) : Number.POSITIVE_INFINITY;
}

function actionSuit(state: LalSattiState, action: LalSattiAction): string {
  if (action.type === 'PASS') return '';
  const actor = state.players[state.currentPlayerIndex]!;
  return actor.hand.find((candidate) => candidate.id === action.cardId)?.suit ?? '';
}

export function chooseLalSattiBotAction(
  state: LalSattiState,
  actor: PlayerId,
  strategy: LalSattiBotStrategy = 'lowest-card',
): LalSattiBotDecision | null {
  if (state.phase === 'completed') return null;

  const current = state.players[state.currentPlayerIndex];
  if (!current || current.id !== actor || current.status !== 'active') {
    throw new Error('NOT_ACTORS_TURN');
  }

  const engine = new LalSattiEngine();
  const actions = engine.legalActions(state, actor);
  if (actions.length === 0) return null;
  if (actions.length === 1 && actions[0]?.type === 'PASS') {
    return { strategy, action: actions[0] };
  }

  const sorted = actions.slice().sort((a, b) => {
    const rankDelta = actionRank(state, a) - actionRank(state, b);
    if (rankDelta !== 0) return strategy === 'shed-high' ? -rankDelta : rankDelta;
    return actionSuit(state, a).localeCompare(actionSuit(state, b));
  });

  return { strategy, action: sorted[0]! };
}
