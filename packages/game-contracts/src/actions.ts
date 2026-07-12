import type { PlayerId } from './state';

/**
 * Draw a hidden card from another player's hand. `positionToken` is opaque and
 * short-lived — it reveals nothing about the card's identity or stable position
 * (ADR-0008). The server resolves it inside the locked transaction.
 */
export interface DrawCardAction {
  readonly type: 'DRAW_CARD';
  readonly actor: PlayerId;
  readonly from: PlayerId;
  readonly positionToken: string;
}

/** Discriminated union of every legal game action. */
export type GameAction = DrawCardAction;

export type GameEventType =
  | 'CARDS_DEALT'
  | 'PAIR_REMOVED'
  | 'CARD_DRAWN'
  | 'TURN_ADVANCED'
  | 'PLAYER_FINISHED'
  | 'GAME_COMPLETED';

export interface GameEvent {
  readonly type: GameEventType;
  readonly stateVersion: number;
}
