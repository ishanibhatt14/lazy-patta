# ADR-0003 — Server-authoritative multiplayer

**Status:** Accepted (2026-07-12) · Locks decision D-52.

## Context

Gadha Chor and future games have **hidden state** (each player's hand, the odd Jack).
Clients must never be able to see or forge hidden state, and concurrent actions on the
same game must be serialized without divergence. The core promise depends on
correctness and anti-cheat.

## Decision

The **server is authoritative**. Every state-changing action is a validated envelope
sent to a Supabase **Edge Function**, which: verifies membership + rate limits, opens
a DB transaction, **locks the game row**, runs the **pure engine** to validate +
apply, writes the new public snapshot + per-player private state + append-only event
log, and **bumps a monotonic `state_version`**. The DB broadcasts a lightweight
version-change; each client refetches the public snapshot and **only its own** private
hand (RLS-enforced). UI animates **after** the authoritative response — no optimistic
hidden-card reveal.

## Alternatives considered

- **Client-authoritative / peer-to-peer.** Rejected: trivially cheatable; hidden hands
  would be visible to clients; no serialization guarantee.
- **Optimistic client apply with server reconciliation.** Rejected for *hidden* state
  (would leak/guess cards); optimistic UI is allowed only for **non-hidden** feedback.
- **Dedicated stateful game server (WebSocket process).** Rejected for MVP: Edge
  Functions + Postgres row locks + Realtime fan-out meet the need statelessly and
  scale horizontally; game state is small and per-game row-locked.

## Consequences

- **+** Truth lives server-side; clients cannot forge or observe hidden state.
- **+** Stateless functions scale horizontally; per-game row lock serializes actions.
- **−** Slightly higher action latency than optimistic UI (mitigated: only hidden
  reveals wait; ambient UI stays responsive).
- Requires idempotency (unique `(game_id, actor_id, client_action_id)`) and
  `expectedVersion` optimistic-concurrency checks.

## Verification method

Engine property tests (one `state_version` bump per accepted action; card
conservation). Integration tests: duplicate `client_action_id` is idempotent; stale
`expectedVersion` is rejected; a non-member action is refused; a client cannot read
another player's private row (RLS). Verified when these tests pass in Stage B.
