/**
 * Wire envelope for a client-submitted action. Verified server-side before the
 * engine runs. `clientActionId` provides idempotency via the DB uniqueness
 * constraint (game_id, actor_id, client_action_id); `expectedVersion` provides
 * optimistic concurrency against the game's monotonic state_version.
 */
export interface GameActionEnvelope {
  readonly gameId: string;
  readonly clientActionId: string;
  readonly expectedVersion: number;
  readonly actionType: 'DRAW_CARD';
  readonly payload: DrawCardPayload;
}

export interface DrawCardPayload {
  readonly fromPlayerId: string;
  readonly positionToken: string;
}

/** Stable, client-facing error codes returned by Edge Functions. */
export type ActionErrorCode =
  | 'NOT_A_MEMBER'
  | 'NOT_YOUR_TURN'
  | 'VERSION_CONFLICT'
  | 'INVALID_POSITION_TOKEN'
  | 'GAME_COMPLETED'
  | 'RATE_LIMITED';
