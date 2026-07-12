# Multiplayer Authority Model

**The server is authoritative.** Clients render state and request actions; they
never decide shuffles, card identity, turn validity, or results. This document is
the contract the [game-table UI](../03-ux-specification/game-table-contract.md) and
[Edge Functions](./api-contracts.md) both bind to.

## Action path (a single accepted action)

1. **Client submits an action envelope** with: JWT, `gameId`, `expectedVersion`,
   unique `clientActionId`, action `type`, and payload (e.g. opaque `positionToken`).
2. **Edge Function verifies** membership + rate limits (per user / IP / room).
3. **DB transaction locks the game row** (`SELECT … FOR UPDATE`) — serializes
   concurrent actions on the same game.
4. **Engine validates** the action against current state (turn, legality, version).
5. **Transaction writes:** new **public snapshot**, affected **private player
   states**, and an **event-log** row; increments **`state_version`** by exactly one.
6. **DB broadcasts** a lightweight **version-change** event on the private game
   channel (no state payload in the broadcast).
7. **Each client fetches** the new public snapshot; each player fetches **only its
   own** private hand (RLS-enforced).

## Versioning & conflict resolution

- Each game has a **monotonic `state_version`**. An action carries the
  `expectedVersion` it was based on.
- If `expectedVersion != current` when the row is locked, the action is **rejected**
  with a version-conflict error; the client re-fetches and retries if still legal.
- Broadcasts intentionally carry only the version — clients pull the authoritative
  snapshot, so a missed/duplicated broadcast can't corrupt state.

## Idempotency

- `(game_id, actor_id, client_action_id)` is **unique** ([schema](./database-schema.md)).
- Re-submitting the same `clientActionId` (e.g. after a flaky network) yields the
  **same single effect** and returns the stored result — safe retries everywhere.

## Presence vs truth

- Realtime **presence** drives only online/offline **UI** (seat status). It is
  **not** game truth. A presence blip never removes a player or advances a turn.

## Reconnect & failure behavior

- WebSocket/presence loss does **not** immediately remove a player.
- **60s grace** (default): seat shows `disconnected`.
- On reconnect, the client **fetches the snapshot + its own hand** and resumes —
  **never replays local assumptions** (no card leakage, no desync).
- After grace, the **host may replace** a disconnected player with a bot.
- **Turn timeout** (only if `turnSeconds` set) may auto-draw a random legal position.
- **All actions are idempotent**, so reconnect-and-retry is always safe.

## Bots on the server

- Bot moves are computed and applied **server-side** via the engine's `botMove`
  (never trusted from a client), with a humanized 500–1200ms delay.
- Same authority path: bot action → locked transaction → version bump → broadcast.

## What clients may and may not do

| Clients MAY                               | Clients MUST NOT                                 |
| ----------------------------------------- | ------------------------------------------------ |
| render public snapshot + own private hand | decide shuffle/deal/card identity                |
| request actions via envelopes             | mutate game state directly                       |
| show presence-based online/offline UI     | read another player's hand (API or Realtime)     |
| run the engine locally for **guest** play | treat local state as authoritative in live rooms |

## Why this is safe & scalable

- **Row-level locking** serializes each game's actions without global contention.
- **Small state** per game keeps transactions fast.
- **Stateless Edge Functions** scale horizontally; Postgres + Realtime fan-out do the
  coordination. See [security](./security-and-privacy.md) for the anti-cheat guarantees.
