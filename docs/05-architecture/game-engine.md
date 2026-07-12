# Game Engine

The engine is the beating heart of the platform: a **pure, deterministic,
UI-independent** TypeScript library that knows how to play every Lazy Patta game.
It lives in `packages/game-engine` and depends only on `game-contracts` + pure
utils — **no UI, no network, no Supabase**.

## Responsibilities

The engine controls (per the product goal): **shuffle, deal, pairs, draw, AI/bots,
turn order, winner/loser, and future games**. The UI only renders the state the
engine produces.

| Concern | Engine owns |
|---------|-------------|
| Deck & shuffle | compose deck, remove cards, shuffle (injected RNG) |
| Deal | distribute per rule pack |
| Legal moves | given `(state, actor)` → valid actions |
| Apply | `reduce(state, action) → { state, events }` |
| Turn model | order, direction, skip finished, timeouts |
| End & result | detect completion, compute winner/loser (Gadha Chor) |
| Bots | choose a legal action + humanized pacing policy |
| Projection | derive **public snapshot** + **per-player private view** |

## Design rules

1. **Pure functions.** `reduce(state, action)` returns a new state; no mutation, no
   side effects, no I/O. Determinism is a hard requirement.
2. **Injected RNG.** The shuffle takes an RNG dependency: **seeded** in tests
   (reproducible), **crypto** in production ([security](./security-and-privacy.md)).
   The engine never calls `Math.random()` directly.
3. **Rule-pack-driven.** Behavior comes from the typed rule pack, not branches per
   family. New variant = new config ([framework](../04-games/game-design-framework.md)).
4. **Game-agnostic core + per-game module.** Shared subsystems (deck, turn manager,
   trick engine, projection) are written once; each game implements the
   contract-defined hooks (setup, legalMoves, reduce, end condition, bot policy).
5. **Projection enforces privacy.** The engine can produce a public view (no hidden
   identities) and a private view per player — the server sends only the right one.

## Public shape (illustrative)

```ts
// packages/game-engine
export interface Engine<S extends GameState, A extends GameAction> {
  init(rulePack: RulePack, players: PlayerId[], rng: Rng): S;
  legalMoves(state: S, actor: PlayerId): A[];
  reduce(state: S, action: A): { state: S; events: GameEvent[] };
  isComplete(state: S): boolean;
  result(state: S): GameResult | null;
  botMove(state: S, actor: PlayerId, rng: Rng): A | null;
  projectPublic(state: S): PublicSnapshot;
  projectPrivate(state: S, viewer: PlayerId): PrivateView;
}
```

Types (`GameState`, `GameAction`, `RulePack`, `PublicSnapshot`, `PrivateView`,
`GameResult`, `GameEvent`, `Rng`) live in `game-contracts` — see
[api-contracts](./api-contracts.md).

## RNG contract

```ts
export interface Rng { next(): number; /* [0,1) */ }
// tests: seeded PRNG (e.g. mulberry32) for reproducible shuffles
// prod:  crypto-backed RNG on the server only
```

Shuffle is a Fisher–Yates using the injected `Rng`. **Production shuffle runs only
on the server**; clients never shuffle or hold the full deck.

## Where the engine runs

- **Server (authoritative):** Edge Functions call `reduce`/`legalMoves`/`result` and
  `botMove` inside the locked DB transaction — the outcome is the only truth.
- **Client (rendering only):** the same package may be used for local **guest vs
  computer** play (no server needed) and for optimistic _non-hidden_ UI, but for
  live rooms the client never derives hidden state — it renders projections it's
  allowed to see.

## Guest / offline mode

For "Play vs computer as guest," the full loop can run **client-side** with the same
engine (deterministic, no network). This gives instant, offline-capable single-player
while sharing 100% of the rules with online play. Live rooms switch to the
server-authoritative path.

## Testing (the engine is the most-tested code in the repo)

Per [testing strategy](../06-developer-handbook/testing-strategy.md):

- **Unit:** deck composition, shuffle invariants, deal, pair detection, turn skip,
  end detection, rule-pack variants.
- **Property-based:** card conservation, no duplicate IDs, exactly one unmatched
  removed-rank card at end, one `state_version` bump per accepted action.
- **Determinism:** same seed + same actions ⇒ identical state (golden fixtures in
  `packages/test-fixtures`).
