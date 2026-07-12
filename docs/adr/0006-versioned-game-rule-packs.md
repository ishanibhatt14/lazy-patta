# ADR-0006 — Versioned game rule packs

**Status:** Accepted (2026-07-12) · Locks decision D-55 / D-10.

## Context

Gadha Chor has many regional family variants, and the platform intends to host
multiple games over time (Judgement, Lal Satti, …). We must avoid per-variant `if`
branches scattered through the engine, and we must be able to evolve rules without
breaking in-flight or replayed games.

## Decision

Game behavior is driven by **typed, versioned rule packs** — data, not code branches.
A rule pack declares (per [api-contracts](../05-architecture/api-contracts.md)):
`id`, `minPlayers`/`maxPlayers`, `removedRank`, `pairing`, `direction`,
`autoRemovePairs`, `turnSeconds`, etc. The engine is **game-agnostic core + per-game
hooks** (setup, legalMoves, reduce, end condition, bot policy). A new game or family
variant is a **new config/hook set**, not an engine rewrite. Rule packs are
**versioned** (id carries version intent, e.g. `classic-gulam-chor`) and stored with
each game so results remain reproducible.

## Alternatives considered

- **Hard-coded rules per game in the engine.** Rejected: brittle, duplicative, and
  impossible to A/B or add family variants cheaply.
- **Fully dynamic scripting (user-supplied rules).** Rejected: security and
  determinism risk; overkill for curated first-party games.
- **Unversioned rule config.** Rejected: rule changes would retroactively alter
  replays/audits; versioning preserves reproducibility.

## Consequences

- **+** New games/variants are additive config; engine stays small and load-bearing
  (an intentional generality investment, per coding standards).
- **+** Reproducible games/replays because the exact rule pack is stored per game.
- **−** Requires a well-typed contract and validation so a malformed pack is rejected
  at the boundary.
- The exact Gujarati family variant (D-10) is still open; the default pack is in place
  so engine work is unblocked.

## Verification method

Engine unit tests run the same reducers against multiple rule packs; a contract
validation test rejects a malformed pack; determinism fixtures confirm same
seed + same pack + same actions ⇒ identical state. Verified when engine tests pass in
Stage B.
