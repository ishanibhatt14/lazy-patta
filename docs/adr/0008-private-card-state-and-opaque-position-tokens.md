# ADR-0008 — Private card state & opaque position tokens

**Status:** Accepted (2026-07-12) · Locks decision D-57.

## Context

In Gadha Chor a player draws a **face-down** card from another player's hand. The
client must be able to _point at_ a specific hidden card to draw it, **without**
learning its identity or the layout of the opponent's hand — otherwise the core
anti-cheat guarantee (no client sees hidden state) is broken. Naive designs (send card
ids, or stable positional indices) leak information or enable inference across turns.

## Decision

Hidden hands live **only server-side** in `game_player_private_state`, readable by
their owner via RLS and never sent to other clients. To let a player select a card to
draw, the server issues **opaque, short-lived position tokens**: per-turn tokens that
map (server-side only) to a hidden card slot, revealing **nothing** about identity or
stable position. The client sends the chosen `positionToken` in the `DRAW_CARD`
envelope; the server resolves it inside the row-locked transaction, applies the draw,
and reveals the card's face **only to the drawer, only after commit**. Tokens are
single-use per turn and not reusable to correlate cards across turns.

## Alternatives considered

- **Send opponent card ids to clients.** Rejected: directly leaks hidden state.
- **Stable positional indices (draw "card #3").** Rejected: enables cross-turn
  inference and tracking of specific cards as hands shuffle.
- **Client-side shuffle/selection.** Rejected: client would need the full/partial deck;
  violates server authority ([ADR-0003](./0003-server-authoritative-multiplayer.md)).

## Consequences

- **+** Clients can select a hidden card to draw with zero information leakage.
- **+** Defense-in-depth: RLS hides the private row _and_ tokens hide position/identity.
- **−** Server must mint/track per-turn tokens and validate them within the
  transaction; tokens must expire with the turn/version to prevent replay.
- Analytics/logs must **never** record card hands, tokens, or OTP values.

## Verification method

Tests assert: another player's private row is unreadable (RLS); a `positionToken`
carries no recoverable card identity and cannot be replayed on a later turn/version;
the drawn face is delivered only to the drawer after commit. Logging tests assert
hands/tokens/OTP never appear in logs. Verified when these tests pass in Stage B.
