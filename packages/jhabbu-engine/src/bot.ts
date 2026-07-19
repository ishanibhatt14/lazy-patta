import {
  type BotDifficulty,
  botMistakeRate,
  type PlayerId,
  type Rng,
} from '@lazy-patta/game-contracts';

import { rankValue } from './cards';
import { JhabbuEngine } from './engine';
import type { JhabbuAction, JhabbuState } from './types';

export type JhabbuBotStrategy = 'careful' | 'shed-low' | 'shed-high';

export interface JhabbuBotDecision {
  readonly strategy: JhabbuBotStrategy;
  readonly action: JhabbuAction;
}

export interface JhabbuBotOptions {
  /** Which heuristic to favour when playing the "best" move. */
  readonly strategy?: JhabbuBotStrategy;
  /** Opponent skill. Defaults to `hard` (deterministic best play). */
  readonly difficulty?: BotDifficulty;
  /** Required for `easy`/`medium` to inject random mistakes; ignored on `hard`. */
  readonly rng?: Rng;
}

function normalizeOptions(options: JhabbuBotOptions | JhabbuBotStrategy): JhabbuBotOptions {
  return typeof options === 'string' ? { strategy: options } : options;
}

function actionCard(state: JhabbuState, action: JhabbuAction) {
  if (action.type !== 'PLAY_CARD') return null;
  return (
    state.players[state.currentPlayerIndex]?.hand.find((card) => card.id === action.cardId) ?? null
  );
}

function suitLength(state: JhabbuState, suit: string): number {
  return (
    state.players[state.currentPlayerIndex]?.hand.filter((card) => card.suit === suit).length ?? 0
  );
}

export function chooseJhabbuBotAction(
  state: JhabbuState,
  actor: PlayerId,
  options: JhabbuBotOptions | JhabbuBotStrategy = {},
): JhabbuBotDecision | null {
  const { strategy = 'careful', difficulty = 'hard', rng } = normalizeOptions(options);

  if (state.phase === 'round_complete') return null;

  const current = state.players[state.currentPlayerIndex];
  if (!current || current.id !== actor || current.status !== 'active') {
    throw new Error('NOT_ACTORS_TURN');
  }

  const engine = new JhabbuEngine();
  const actions = engine.legalActions(state, actor);
  if (actions.length === 0) return null;
  if (actions[0]?.type === 'DRAW_FROM_WASTE') return { strategy, action: actions[0] };

  const sorted = actions.slice().sort((a, b) => {
    const aCard = actionCard(state, a);
    const bCard = actionCard(state, b);
    if (!aCard || !bCard) return 0;

    if (state.currentTrick.length === 0) {
      const suitDelta = suitLength(state, bCard.suit) - suitLength(state, aCard.suit);
      if (suitDelta !== 0) return suitDelta;
    }

    const rankDelta = rankValue(aCard.rank) - rankValue(bCard.rank);
    if (rankDelta !== 0) return strategy === 'shed-high' ? -rankDelta : rankDelta;
    return aCard.suit.localeCompare(bCard.suit);
  });

  const mistakeRate = botMistakeRate(difficulty);
  if (rng && mistakeRate > 0 && actions.length > 1 && rng.next() < mistakeRate) {
    const index = Math.min(actions.length - 1, Math.floor(rng.next() * actions.length));
    return { strategy, action: actions[index]! };
  }

  return { strategy, action: sorted[0]! };
}
