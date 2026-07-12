import type { GameAction, GameState } from '@lazy-patta/game-contracts';
import { CLASSIC_GULAM_CHOR, seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { BotError, chooseBotAction, isBotError } from './bot';
import { GadhaChorEngine } from './gadha-chor-engine';

function freshGame(seed: number, players: string[]): { engine: GadhaChorEngine; state: GameState } {
  const engine = new GadhaChorEngine();
  return { engine, state: engine.init(CLASSIC_GULAM_CHOR, players, seededRng(seed)) };
}

describe('chooseBotAction', () => {
  it('selects only from the provided valid actions', () => {
    const { engine, state } = freshGame(7, ['a', 'b', 'c']);
    const actorId = state.players[state.currentPlayerIndex]!.id;
    const validActions = engine.legalMoves(state, actorId);

    for (let i = 0; i < 50; i++) {
      const { action, strategy } = chooseBotAction({
        gameState: state,
        actorId,
        validActions,
        rng: seededRng(i),
      });
      expect(strategy).toBe('random-valid');
      expect(validActions).toContainEqual(action);
    }
  });

  it('is deterministic under an injected rng', () => {
    const { engine, state } = freshGame(11, ['a', 'b', 'c']);
    const actorId = state.players[state.currentPlayerIndex]!.id;
    const validActions = engine.legalMoves(state, actorId);

    const first = chooseBotAction({ gameState: state, actorId, validActions, rng: seededRng(99) });
    const second = chooseBotAction({ gameState: state, actorId, validActions, rng: seededRng(99) });
    expect(first).toEqual(second);
  });

  it('throws NO_VALID_ACTIONS when the action list is empty', () => {
    const { state } = freshGame(3, ['a', 'b']);
    const actorId = state.players[state.currentPlayerIndex]!.id;
    try {
      chooseBotAction({ gameState: state, actorId, validActions: [], rng: seededRng(1) });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(isBotError(err)).toBe(true);
      expect((err as BotError).code).toBe('NO_VALID_ACTIONS');
    }
  });

  it('throws NOT_ACTORS_TURN for a player who is not on turn', () => {
    const { state } = freshGame(3, ['a', 'b', 'c']);
    const notCurrent = state.players.find(
      (p) => p.id !== state.players[state.currentPlayerIndex]!.id,
    )!.id;
    expect(() =>
      chooseBotAction({
        gameState: state,
        actorId: notCurrent,
        validActions: [],
        rng: seededRng(1),
      }),
    ).toThrow(BotError);
    try {
      chooseBotAction({
        gameState: state,
        actorId: notCurrent,
        validActions: [],
        rng: seededRng(1),
      });
    } catch (err) {
      expect((err as BotError).code).toBe('NOT_ACTORS_TURN');
    }
  });

  it('rejects a candidate action whose actor is not the bot', () => {
    const { engine, state } = freshGame(5, ['a', 'b', 'c']);
    const actorId = state.players[state.currentPlayerIndex]!.id;
    const [legal] = engine.legalMoves(state, actorId);
    const spoofed: GameAction = { ...legal!, actor: 'someone-else' };
    try {
      chooseBotAction({ gameState: state, actorId, validActions: [spoofed], rng: seededRng(1) });
    } catch (err) {
      expect((err as BotError).code).toBe('INVALID_ACTION_ACTOR');
    }
  });

  it('rejects a candidate action targeting the bot itself (unavailable position)', () => {
    const { engine, state } = freshGame(5, ['a', 'b', 'c']);
    const actorId = state.players[state.currentPlayerIndex]!.id;
    const [legal] = engine.legalMoves(state, actorId);
    const selfTarget: GameAction = { ...legal!, from: actorId };
    try {
      chooseBotAction({ gameState: state, actorId, validActions: [selfTarget], rng: seededRng(1) });
    } catch (err) {
      expect((err as BotError).code).toBe('INVALID_TARGET');
    }
  });

  it('throws GAME_COMPLETED once the game is over', () => {
    const engine = new GadhaChorEngine();
    let state = engine.init(CLASSIC_GULAM_CHOR, ['a', 'b'], seededRng(2));
    const botRng = seededRng(42);
    let guard = 0;
    while (!engine.isComplete(state) && guard < 10_000) {
      guard += 1;
      state = engine.reduce(
        state,
        engine.botMove(state, state.players[state.currentPlayerIndex]!.id, botRng)!,
      ).state;
    }
    expect(engine.isComplete(state)).toBe(true);
    const actorId = state.players[state.currentPlayerIndex]!.id;
    try {
      chooseBotAction({ gameState: state, actorId, validActions: [], rng: seededRng(1) });
    } catch (err) {
      expect((err as BotError).code).toBe('GAME_COMPLETED');
    }
  });
});
