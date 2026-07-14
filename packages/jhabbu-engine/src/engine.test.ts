import { cardId, type Card, type PlayerId, type Rank, type Suit } from '@lazy-patta/game-contracts';
import { seededRng } from '@lazy-patta/test-fixtures';
import { describe, expect, it } from 'vitest';

import { chooseJhabbuBotAction } from './bot';
import { JhabbuEngine } from './engine';
import { JHABBU_GUJARATI_FAMILY } from './rules';
import type { JhabbuPlayerState, JhabbuState } from './types';

function card(suit: Suit, rank: Rank): Card {
  return { id: cardId(suit, rank), suit, rank };
}

function player(id: PlayerId, hand: readonly Card[]): JhabbuPlayerState {
  return {
    id,
    seat: Number(id.replace(/\D/g, '')) || 0,
    hand,
    status: 'active',
    isBot: id.startsWith('bot'),
    finishPosition: null,
    penaltyPoints: 0,
  };
}

function stateWith(
  players: readonly JhabbuPlayerState[],
  options: Partial<
    Pick<
      JhabbuState,
      | 'currentPlayerIndex'
      | 'powerPlayerId'
      | 'ledSuit'
      | 'currentTrick'
      | 'wastePile'
      | 'phase'
      | 'stateVersion'
      | 'finishOrder'
    >
  > = {},
): JhabbuState {
  return {
    rulePack: JHABBU_GUJARATI_FAMILY,
    players,
    currentPlayerIndex: options.currentPlayerIndex ?? 0,
    powerPlayerId: options.powerPlayerId ?? players[0]!.id,
    ledSuit: options.ledSuit ?? null,
    currentTrick: options.currentTrick ?? [],
    wastePile: options.wastePile ?? [],
    finishOrder: options.finishOrder ?? [],
    roundNumber: 1,
    phase: options.phase ?? 'in_progress',
    stateVersion: options.stateVersion ?? 1,
    loserId: null,
    completionReason: null,
  };
}

function allCards(state: JhabbuState): readonly Card[] {
  return [
    ...state.players.flatMap((entry) => entry.hand),
    ...state.currentTrick.map((entry) => entry.card),
    ...state.wastePile,
  ];
}

function playUntilComplete(playerCount: number, seed: number): JhabbuState {
  const engine = new JhabbuEngine();
  let state = engine.init(
    Array.from({ length: playerCount }, (_, index) => `p${index + 1}`),
    seededRng(seed),
  );

  for (let turn = 0; turn < 2_000; turn += 1) {
    if (state.phase === 'round_complete') return state;
    const actor = state.players[state.currentPlayerIndex]!.id;
    const decision = chooseJhabbuBotAction(state, actor);
    if (!decision) throw new Error('NO_DETERMINISTIC_ACTION');
    state = engine.reduce(state, decision.action).state;
  }

  throw new Error(`SIMULATION_DID_NOT_TERMINATE:${playerCount}:${seed}`);
}

function runBoundedSimulation(playerCount: number, seed: number, maxTurns: number): JhabbuState {
  const engine = new JhabbuEngine();
  let state = engine.init(
    Array.from({ length: playerCount }, (_, index) => `p${index + 1}`),
    seededRng(seed),
  );

  for (let turn = 0; turn < maxTurns; turn += 1) {
    expect(allCards(state)).toHaveLength(52);
    expect(new Set(allCards(state).map((entry) => entry.id))).toHaveLength(52);
    if (state.phase === 'round_complete') return state;

    const actor = state.players[state.currentPlayerIndex]!.id;
    const decision = chooseJhabbuBotAction(state, actor);
    if (!decision) throw new Error(`NO_DETERMINISTIC_ACTION:${playerCount}:${seed}:${turn}`);
    state = engine.reduce(state, decision.action).state;
  }

  expect(allCards(state)).toHaveLength(52);
  expect(new Set(allCards(state).map((entry) => entry.id))).toHaveLength(52);
  return state;
}

describe('JhabbuEngine', () => {
  it.each([3, 4, 5, 6])('deals all 52 unique cards for %i players', (playerCount) => {
    const engine = new JhabbuEngine();
    const state = engine.init(
      Array.from({ length: playerCount }, (_, index) => `p${index + 1}`),
      seededRng(500 + playerCount),
    );

    expect(allCards(state)).toHaveLength(52);
    expect(new Set(allCards(state).map((entry) => entry.id))).toHaveLength(52);
  });

  it('makes the ace of spades holder open with only the ace of spades', () => {
    const engine = new JhabbuEngine();
    const state = engine.init(['you', 'bot-a', 'bot-b'], seededRng(12));
    const opener = state.players[state.currentPlayerIndex]!;

    expect(opener.hand.some((entry) => entry.id === 'spades-ace')).toBe(true);
    expect(engine.legalActions(state, opener.id)).toEqual([
      { type: 'PLAY_CARD', actor: opener.id, cardId: 'spades-ace' },
    ]);
  });

  it('discards the completed first trick and returns power to the opener', () => {
    const engine = new JhabbuEngine();
    let state = stateWith(
      [
        player('p1', [card('spades', 'ace'), card('clubs', '2')]),
        player('p2', [card('spades', 'king'), card('clubs', '3')]),
        player('p3', [card('hearts', '4'), card('clubs', '4')]),
      ],
      { phase: 'first_trick', stateVersion: 0 },
    );

    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p1', cardId: 'spades-ace' }).state;
    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p2', cardId: 'spades-king' }).state;
    const result = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p3', cardId: 'hearts-4' });

    expect(result.state.phase).toBe('in_progress');
    expect(result.state.currentTrick).toHaveLength(0);
    expect(result.state.wastePile.map((entry) => entry.id)).toEqual([
      'spades-ace',
      'spades-king',
      'hearts-4',
    ]);
    expect(result.state.powerPlayerId).toBe('p1');
    expect(result.state.players[result.state.currentPlayerIndex]?.id).toBe('p1');
    expect(result.events.map((event) => event.type)).toContain('FIRST_TRICK_DISCARDED');
  });

  it('requires following the led suit while the actor has that suit', () => {
    const engine = new JhabbuEngine();
    let state = stateWith([
      player('p1', [card('hearts', '6')]),
      player('p2', [card('hearts', '2'), card('clubs', 'ace')]),
      player('p3', [card('hearts', '3')]),
    ]);

    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p1', cardId: 'hearts-6' }).state;

    expect(engine.legalActions(state, 'p2')).toEqual([
      { type: 'PLAY_CARD', actor: 'p2', cardId: 'hearts-2' },
    ]);
    expect(() =>
      engine.reduce(state, { type: 'PLAY_CARD', actor: 'p2', cardId: 'clubs-ace' }),
    ).toThrow('ILLEGAL_CARD');
  });

  it('lets a void player trigger Thulla and makes the highest led suit pick up', () => {
    const engine = new JhabbuEngine();
    let state = stateWith([
      player('p1', [card('hearts', '6'), card('clubs', '3')]),
      player('p2', [card('hearts', 'queen'), card('clubs', '4')]),
      player('p3', [card('clubs', '2'), card('diamonds', '5')]),
    ]);

    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p1', cardId: 'hearts-6' }).state;
    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p2', cardId: 'hearts-queen' }).state;
    const result = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p3', cardId: 'clubs-2' });

    expect(result.state.currentTrick).toHaveLength(0);
    expect(result.state.wastePile).toHaveLength(0);
    expect(result.state.powerPlayerId).toBe('p2');
    expect(result.state.players[result.state.currentPlayerIndex]?.id).toBe('p2');
    expect(result.state.players[1]?.hand.map((entry) => entry.id).sort()).toEqual([
      'clubs-2',
      'clubs-4',
      'hearts-6',
      'hearts-queen',
    ]);
    expect(result.events.map((event) => event.type)).toContain('THULLA_TRIGGERED');
  });

  it('discards a normal trick and transfers power to the highest led suit', () => {
    const engine = new JhabbuEngine();
    let state = stateWith([
      player('p1', [card('hearts', '6'), card('clubs', '3')]),
      player('p2', [card('hearts', 'queen'), card('clubs', '4')]),
      player('p3', [card('hearts', '2'), card('diamonds', '5')]),
    ]);

    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p1', cardId: 'hearts-6' }).state;
    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p2', cardId: 'hearts-queen' }).state;
    const result = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p3', cardId: 'hearts-2' });

    expect(result.state.currentTrick).toHaveLength(0);
    expect(result.state.wastePile.map((entry) => entry.id)).toEqual([
      'hearts-6',
      'hearts-queen',
      'hearts-2',
    ]);
    expect(result.state.powerPlayerId).toBe('p2');
    expect(result.state.players[result.state.currentPlayerIndex]?.id).toBe('p2');
  });

  it('marks empty non-power players as safely away after trick resolution', () => {
    const engine = new JhabbuEngine();
    let state = stateWith([
      player('p1', [card('hearts', '6'), card('clubs', '3')]),
      player('p2', [card('hearts', 'queen'), card('clubs', '4')]),
      player('p3', [card('hearts', '2')]),
    ]);

    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p1', cardId: 'hearts-6' }).state;
    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p2', cardId: 'hearts-queen' }).state;
    const result = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p3', cardId: 'hearts-2' });

    expect(result.state.players[2]?.status).toBe('got_away');
    expect(result.state.finishOrder).toEqual(['p3']);
    expect(result.events).toContainEqual({
      type: 'PLAYER_GOT_AWAY',
      actor: 'p3',
      finishPosition: 1,
      stateVersion: 4,
    });
  });

  it('requires an empty power player to draw from waste before leading', () => {
    const engine = new JhabbuEngine();
    let state = stateWith(
      [
        player('p1', [card('hearts', 'ace')]),
        player('p2', [card('hearts', 'king'), card('clubs', '4')]),
        player('p3', [card('hearts', '2'), card('clubs', '5')]),
      ],
      { wastePile: [card('diamonds', '3')] },
    );

    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p1', cardId: 'hearts-ace' }).state;
    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p2', cardId: 'hearts-king' }).state;
    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p3', cardId: 'hearts-2' }).state;

    expect(state.powerPlayerId).toBe('p1');
    expect(state.players[state.currentPlayerIndex]?.id).toBe('p1');
    expect(engine.legalActions(state, 'p1')).toEqual([{ type: 'DRAW_FROM_WASTE', actor: 'p1' }]);

    const result = engine.reduce(state, { type: 'DRAW_FROM_WASTE', actor: 'p1' });
    expect(
      result.state.players[result.state.currentPlayerIndex]?.hand.map((entry) => entry.id),
    ).toEqual(['diamonds-3']);
    expect(result.events.map((event) => event.type)).toEqual(['WASTE_DRAWN']);
  });

  it('completes the round when only one player remains with cards', () => {
    const engine = new JhabbuEngine();
    let state = stateWith([
      player('p1', [card('hearts', '6')]),
      player('p2', [card('hearts', '2')]),
      player('p3', [card('hearts', 'king'), card('clubs', '5')]),
    ]);

    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p1', cardId: 'hearts-6' }).state;
    state = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p2', cardId: 'hearts-2' }).state;
    const result = engine.reduce(state, { type: 'PLAY_CARD', actor: 'p3', cardId: 'hearts-king' });

    expect(result.state.phase).toBe('round_complete');
    expect(result.state.loserId).toBe('p3');
    expect(result.state.finishOrder).toEqual(['p1', 'p2']);
    expect(new JhabbuEngine().result(result.state)).toEqual({
      loserId: 'p3',
      finishOrder: ['p1', 'p2'],
      penaltyPoints: { p1: 0, p2: 1, p3: 3 },
      remainingCards: { p1: 0, p2: 0, p3: 1 },
    });
  });

  it('rejects stale actions', () => {
    const engine = new JhabbuEngine();
    const state = stateWith([
      player('p1', [card('hearts', '6')]),
      player('p2', [card('hearts', '2')]),
      player('p3', [card('hearts', '3')]),
    ]);

    expect(() =>
      engine.reduce(state, {
        type: 'PLAY_CARD',
        actor: 'p1',
        cardId: 'hearts-6',
        expectedVersion: 0,
      }),
    ).toThrow('STALE_ACTION');
  });

  it.each([3, 4, 5, 6])('runs a deterministic %i-player bot simulation', (playerCount) => {
    const finalState = playUntilComplete(playerCount, 20260714 + playerCount);

    expect(finalState.phase).toBe('round_complete');
    expect(finalState.loserId).toBeTruthy();
    expect(allCards(finalState)).toHaveLength(52);
    expect(new Set(allCards(finalState).map((entry) => entry.id))).toHaveLength(52);
  });

  it('runs 100 bounded deterministic simulations without card loss', () => {
    const results = Array.from({ length: 100 }, (_, index) => {
      const playerCount = 3 + (index % 4);
      return runBoundedSimulation(playerCount, 9_000 + index, 250);
    });

    expect(results.every((state) => allCards(state).length === 52)).toBe(true);
  });
});
