import {
  type BotDifficulty,
  botMistakeRate,
  type Card,
  type PlayerId,
  type Rng,
} from '@lazy-patta/game-contracts';

import { rankValue, trickWinner } from './cards';
import { KachufulEngine } from './engine';
import { legalBids, legalPlayableCards } from './rules';
import type { KachufulAction, KachufulState, KachufulTrump } from './types';

export interface KachufulBotDecision {
  readonly action: KachufulAction;
}

export interface KachufulBotOptions {
  readonly difficulty?: BotDifficulty;
  /** Required for `easy`/`medium` to inject random mistakes; ignored on `hard`. */
  readonly rng?: Rng;
}

/**
 * Rough trick expectation for a hand: high trumps and off-suit aces/kings are
 * the cards most likely to win a trick. Deterministic — no rng.
 */
export function estimateBid(hand: readonly Card[], trump: KachufulTrump, handSize: number): number {
  let estimate = 0;
  for (const card of hand) {
    const isTrump = trump !== 'no-trump' && card.suit === trump;
    if (isTrump) {
      estimate += rankValue(card.rank) >= rankValue('queen') ? 1 : 0.5;
    } else if (card.rank === 'ace') {
      estimate += 0.9;
    } else if (card.rank === 'king') {
      estimate += 0.5;
    }
  }
  return Math.max(0, Math.min(handSize, Math.round(estimate)));
}

function nearestLegalBid(target: number, legal: readonly number[]): number {
  return legal.reduce((best, bid) =>
    Math.abs(bid - target) < Math.abs(best - target) ? bid : best,
  );
}

function chooseBid(state: KachufulState, actor: PlayerId): KachufulAction | null {
  const legal = legalBids(state, actor);
  if (legal.length === 0) return null;
  const hand = state.players[state.currentPlayerIndex]!.hand;
  const target = estimateBid(hand, state.trump, state.handSize);
  return { type: 'PLACE_BID', actor, bid: nearestLegalBid(target, legal) };
}

function wouldWinTrick(state: KachufulState, card: Card): boolean {
  const ledSuit = state.ledSuit ?? card.suit;
  const projected = [
    ...state.currentTrick,
    { playerId: 'bot', card, sequence: state.currentTrick.length },
  ];
  return trickWinner(projected, ledSuit, state.trump).card.id === card.id;
}

function choosePlay(state: KachufulState, actor: PlayerId): KachufulAction | null {
  const playable = legalPlayableCards(state, actor);
  if (playable.length === 0) return null;
  const current = state.players[state.currentPlayerIndex]!;
  const wantsTricks = current.tricksWon < (current.bid ?? 0);

  const byRankAsc = playable.slice().sort((a, b) => rankValue(a.rank) - rankValue(b.rank));
  const winners = byRankAsc.filter((card) => wouldWinTrick(state, card));
  const losers = byRankAsc.filter((card) => !wouldWinTrick(state, card));

  let choice: Card;
  if (wantsTricks) {
    // Take the trick as cheaply as possible; otherwise shed the lowest card.
    choice = winners[0] ?? byRankAsc[0]!;
  } else {
    // Avoid winning: play the highest card that still loses, else the lowest.
    choice = losers[losers.length - 1] ?? byRankAsc[0]!;
  }
  return { type: 'PLAY_CARD', actor, cardId: choice.id };
}

export function chooseKachufulBotAction(
  state: KachufulState,
  actor: PlayerId,
  options: KachufulBotOptions = {},
): KachufulBotDecision | null {
  const { difficulty = 'hard', rng } = options;
  if (state.phase === 'match_complete') return null;

  const current = state.players[state.currentPlayerIndex];
  if (!current || current.id !== actor) throw new Error('NOT_ACTORS_TURN');

  const engine = new KachufulEngine();
  const actions = engine.legalActions(state, actor);
  if (actions.length === 0) return null;
  if (state.phase === 'round_scored') return { action: actions[0]! };

  const mistakeRate = botMistakeRate(difficulty);
  if (rng && mistakeRate > 0 && actions.length > 1 && rng.next() < mistakeRate) {
    const index = Math.min(actions.length - 1, Math.floor(rng.next() * actions.length));
    return { action: actions[index]! };
  }

  const best = state.phase === 'bidding' ? chooseBid(state, actor) : choosePlay(state, actor);
  return { action: best ?? actions[0]! };
}
