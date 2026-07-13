import { cardId, type Card, type Rank, type Suit } from '@lazy-patta/game-contracts';
import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { chooseLalSattiBotAction } from './bot';
import { LalSattiEngine } from './engine';
import { createAllSevensTableau, createEmptyTableau, LAL_SATTI_CLASSIC } from './rules';
import { LalSattiInvariantError, type LalSattiPlayerState, type LalSattiState } from './types';

function card(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

function player(id: string, hand: readonly Card[]): LalSattiPlayerState {
  return { id, hand, status: 'active', isBot: id.startsWith('bot') };
}

function stateWith(
  players: readonly LalSattiPlayerState[],
  options: Partial<
    Pick<LalSattiState, 'tableau' | 'stateVersion' | 'currentPlayerIndex' | 'consecutivePasses'>
  > = {},
): LalSattiState {
  return {
    rulePack: LAL_SATTI_CLASSIC,
    players,
    currentPlayerIndex: options.currentPlayerIndex ?? 0,
    tableau: options.tableau ?? createAllSevensTableau(),
    phase: 'in_progress',
    stateVersion: options.stateVersion ?? 1,
    consecutivePasses: options.consecutivePasses ?? 0,
    winnerIds: [],
    completionReason: null,
  };
}

function allCards(state: LalSattiState): readonly Card[] {
  return [...Object.values(state.tableau).flat(), ...state.players.flatMap((entry) => entry.hand)];
}

function playUntilComplete(playerCount: number, seed: number): LalSattiState {
  const engine = new LalSattiEngine();
  let state = engine.init(
    Array.from({ length: playerCount }, (_, index) => `p${index + 1}`),
    seededRng(seed),
  );

  for (let turn = 0; turn < 500; turn += 1) {
    if (state.phase === 'completed') return state;
    const actor = state.players[state.currentPlayerIndex]!.id;
    const decision = chooseLalSattiBotAction(state, actor);
    if (!decision) throw new Error('NO_DETERMINISTIC_ACTION');
    state = engine.reduce(state, decision.action).state;
  }

  throw new Error('SIMULATION_DID_NOT_TERMINATE');
}

describe('LalSattiEngine', () => {
  it.each([3, 4, 5, 6])('deals all 52 unique cards for %i players', (playerCount) => {
    const engine = new LalSattiEngine();
    const state = engine.init(
      Array.from({ length: playerCount }, (_, index) => `p${index + 1}`),
      seededRng(100 + playerCount),
    );

    expect(Object.values(state.tableau).flat()).toHaveLength(0);
    expect(allCards(state)).toHaveLength(52);
    expect(new Set(allCards(state).map((entry) => entry.id))).toHaveLength(52);
  });

  it('deals all sevens into player hands for classic Lal Satti', () => {
    const engine = new LalSattiEngine();
    const state = engine.init(['you', 'bot-a', 'bot-b', 'bot-c'], seededRng(7));
    const dealtSevens = state.players.flatMap((entry) =>
      entry.hand.filter((cardInHand) => cardInHand.rank === '7'),
    );

    expect(Object.values(state.tableau).flat()).toHaveLength(0);
    expect(dealtSevens.map((entry) => entry.id).sort()).toEqual([
      'clubs-7',
      'diamonds-7',
      'hearts-7',
      'spades-7',
    ]);
  });

  it('makes the holder of 7 hearts the opening player', () => {
    const engine = new LalSattiEngine();
    const state = engine.init(['you', 'bot-a', 'bot-b', 'bot-c'], seededRng(11));
    const opener = state.players[state.currentPlayerIndex]!;

    expect(opener.hand.some((entry) => entry.id === 'hearts-7')).toBe(true);
    expect(engine.legalActions(state, opener.id)).toEqual([
      { type: 'PLAY_CARD', actor: opener.id, cardId: 'hearts-7' },
    ]);
  });

  it('allows only 7 hearts as the first action', () => {
    const engine = new LalSattiEngine();
    const state = stateWith(
      [
        player('you', [card('hearts', '7'), card('clubs', '7'), card('hearts', '6')]),
        player('bot-a', []),
      ],
      { tableau: createEmptyTableau(), stateVersion: 0 },
    );

    expect(engine.legalActions(state, 'you')).toEqual([
      { type: 'PLAY_CARD', actor: 'you', cardId: 'hearts-7' },
    ]);
    expect(() =>
      engine.reduce(state, { type: 'PLAY_CARD', actor: 'you', cardId: 'clubs-7' }),
    ).toThrow('ILLEGAL_CARD');
  });

  it('advances turn order after the opening move', () => {
    const engine = new LalSattiEngine();
    const state = stateWith(
      [
        player('you', [card('hearts', '7'), card('clubs', '7')]),
        player('bot-a', [card('hearts', '6')]),
      ],
      { tableau: createEmptyTableau(), stateVersion: 0 },
    );

    const next = engine.reduce(state, { type: 'PLAY_CARD', actor: 'you', cardId: 'hearts-7' });

    expect(next.state.currentPlayerIndex).toBe(1);
    expect(next.state.tableau.hearts.map((entry) => entry.id)).toEqual(['hearts-7']);
    expect(next.events.map((event) => event.type)).toEqual(['CARD_PLAYED', 'TURN_ADVANCED']);
  });

  it('opens other suits when their seven is played', () => {
    const engine = new LalSattiEngine();
    const state = stateWith(
      [player('you', [card('clubs', '7')]), player('bot-a', [card('hearts', '6')])],
      { tableau: { ...createEmptyTableau(), hearts: [card('hearts', '7')] } },
    );

    const next = engine.reduce(state, { type: 'PLAY_CARD', actor: 'you', cardId: 'clubs-7' });

    expect(next.state.tableau.clubs.map((entry) => entry.id)).toEqual(['clubs-7']);
  });

  it('rejects non-seven cards into unopened suits', () => {
    const engine = new LalSattiEngine();
    const state = stateWith(
      [player('you', [card('clubs', '6')]), player('bot-a', [card('hearts', '6')])],
      { tableau: { ...createEmptyTableau(), hearts: [card('hearts', '7')] } },
    );

    expect(engine.legalActions(state, 'you')).toEqual([{ type: 'PASS', actor: 'you' }]);
    expect(() =>
      engine.reduce(state, { type: 'PLAY_CARD', actor: 'you', cardId: 'clubs-6' }),
    ).toThrow('ILLEGAL_CARD');
  });

  it('makes 6 and 8 legal after a seven is played', () => {
    const engine = new LalSattiEngine();
    const state = stateWith([
      player('you', [card('hearts', '6'), card('hearts', '8'), card('hearts', '5')]),
      player('bot-a', [card('clubs', '2')]),
    ]);

    expect(engine.legalActions(state, 'you')).toEqual([
      { type: 'PLAY_CARD', actor: 'you', cardId: 'hearts-6' },
      { type: 'PLAY_CARD', actor: 'you', cardId: 'hearts-8' },
    ]);
  });

  it('rejects pass when any legal move exists', () => {
    const engine = new LalSattiEngine();
    const state = stateWith([
      player('you', [card('hearts', '6')]),
      player('bot-a', [card('clubs', '6')]),
    ]);

    expect(() => engine.reduce(state, { type: 'PASS', actor: 'you' })).toThrow('PASS_NOT_ALLOWED');
  });

  it('completes when a player empties their hand', () => {
    const engine = new LalSattiEngine();
    const state = stateWith([
      player('you', [card('hearts', '6')]),
      player('bot-a', [card('clubs', '6')]),
    ]);

    const next = engine.reduce(state, { type: 'PLAY_CARD', actor: 'you', cardId: 'hearts-6' });

    expect(next.state.phase).toBe('completed');
    expect(next.state.winnerIds).toEqual(['you']);
    expect(engine.result(next.state)).toEqual({
      winnerIds: ['you'],
      reason: 'hand_empty',
      remainingCards: { you: 0, 'bot-a': 1 },
      remainingPoints: { you: 0, 'bot-a': 6 },
    });
  });

  it('throws a diagnostic invariant error after a full blocked pass cycle', () => {
    const engine = new LalSattiEngine();
    const state = stateWith(
      [player('you', [card('clubs', '6')]), player('bot-a', [card('diamonds', '6')])],
      {
        tableau: { ...createEmptyTableau(), hearts: [card('hearts', '7')] },
        consecutivePasses: 1,
      },
    );

    expect(() => engine.reduce(state, { type: 'PASS', actor: 'you' })).toThrow(
      LalSattiInvariantError,
    );

    try {
      engine.reduce(state, { type: 'PASS', actor: 'you' });
    } catch (error) {
      expect(error).toBeInstanceOf(LalSattiInvariantError);
      expect((error as LalSattiInvariantError).diagnostic).toEqual({
        code: 'BLOCKED_CYCLE',
        stateVersion: 1,
        currentPlayerId: 'you',
        activePlayerCount: 2,
        consecutivePasses: 2,
        openSuits: ['hearts'],
      });
    }
  });

  it.each([3, 4, 5, 6])(
    'runs a complete deterministic %i-player simulation with a hand-empty winner',
    (playerCount) => {
      const finalState = playUntilComplete(playerCount, 20260712 + playerCount);

      expect(finalState.phase).toBe('completed');
      expect(finalState.completionReason).toBe('hand_empty');
      expect(finalState.winnerIds).toHaveLength(1);
      expect(allCards(finalState)).toHaveLength(52);
      expect(new Set(allCards(finalState).map((entry) => entry.id))).toHaveLength(52);
    },
  );

  it('fixed seeds produce reproducible games', () => {
    const first = playUntilComplete(4, 404);
    const second = playUntilComplete(4, 404);

    expect(first.winnerIds).toEqual(second.winnerIds);
    expect(first.stateVersion).toBe(second.stateVersion);
    expect(first.players.map((entry) => entry.hand.map((cardInHand) => cardInHand.id))).toEqual(
      second.players.map((entry) => entry.hand.map((cardInHand) => cardInHand.id)),
    );
  });

  it('runs 100 deterministic simulations without blocked-state completion', () => {
    const results = Array.from({ length: 100 }, (_, index) => {
      const playerCount = 3 + (index % 4);
      return playUntilComplete(playerCount, 9000 + index);
    });

    expect(results.every((state) => state.completionReason === 'hand_empty')).toBe(true);
    expect(results.every((state) => state.winnerIds.length === 1)).toBe(true);
  });
});
