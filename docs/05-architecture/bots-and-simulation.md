# Bots & Simulation

How the pure engine chooses bot actions and runs whole games headlessly. This
complements the [Game Engine](./game-engine.md) doc and the Gadha Chor
[game design](../04-games/gadha-chor.md). Everything here lives in
`packages/game-engine` and obeys the same purity rules: no time, no I/O, no
network, no `Math.random` — all randomness is injected.

## Bot decision boundary

The engine exposes a single pure function that turns a legal-action set into a
choice:

```ts
chooseBotAction({
  gameState,   // full authoritative GameState
  actorId,     // the seat being asked to move
  validActions, // engine.legalMoves(state, actorId)
  rng,         // injected Rng — never Math.random
  strategy,    // optional; defaults to 'random-valid'
}): { strategy, action }
```

It **decides**, it does not **execute**. Returning a `BotDecision` keeps the
engine free of scheduling: the server/UI orchestration layer owns _when_ the
action runs and applies the 500–1200 ms humanized pacing described in the
[game design](../04-games/gadha-chor.md). No `setTimeout` or animation delay ever
lives inside the engine.

`GadhaChorEngine.botMove` is a thin convenience wrapper that computes
`legalMoves` and delegates to `chooseBotAction`, so there is one selection path.

### Strategies

```ts
type BotStrategy = 'random-valid';
```

Gadha Chor is chance-driven, so the MVP strategy picks uniformly among the
server-issued legal actions. This is honest — there is no meaningful skill to
fake. The `strategy` field and `BotDecision.strategy` echo make room for smarter
policies later (light card-counting, odd-card avoidance) without changing the
boundary.

### Typed errors

`chooseBotAction` throws a `BotError` (with a stable `.code`) for invalid turns,
so orchestration can branch on the code:

| Code                   | Meaning                                       |
| ---------------------- | --------------------------------------------- |
| `GAME_COMPLETED`       | asked to move in a finished game              |
| `NOT_ACTORS_TURN`      | `actorId` is not the current active seat      |
| `NO_VALID_ACTIONS`     | empty `validActions`                          |
| `INVALID_ACTION_ACTOR` | a candidate's `actor` is not the bot          |
| `INVALID_TARGET`       | a candidate targets self or a non-active seat |
| `UNKNOWN_STRATEGY`     | unsupported `strategy`                        |

Use `isBotError(err)` to narrow. These guarantees are defense in depth: even if a
caller passes a bad action set, a bot can never act out of turn or draw from an
unavailable position.

## Deterministic RNG expectations

The engine never seeds anything itself. `Rng` is injected (`{ next(): number }`
in `[0, 1)`), seeded in tests (mulberry32) and crypto-backed in production. The
same `rng` sequence over the same state always yields the same choice.

The simulation runner takes a `createRng(streamSeed) => Rng` **factory** plus a
`seed`, and derives two independent streams — one for the shuffle, one for bot
decisions — so a single seed reproduces an entire game. Injecting the factory
(rather than importing a PRNG) keeps the engine boundary-clean.

## Simulation API

```ts
simulateGame({
  playerCount,   // 2..6
  seed,          // deterministic entry point
  rulePack,      // required RulePack (no hidden default in the pure engine)
  createRng,     // (streamSeed) => Rng
  maxTurns,      // optional safety bound (default 10_000)
  captureEvents, // optional; include the ordered event trace
  strategy,      // optional bot policy
  players,       // optional explicit ids (default p1..pN)
}): SimulationResult
```

`SimulationResult` reports `seed`, `rulePackId`, `players`, `turns` (accepted
actions), `completed`, `reachedTurnLimit`, `result` (`{ winners, loser } | null`),
`finalState`, `publicSnapshot`, and — only when requested — `events`. Runs are
delay-free; the caller owns pacing and persistence.

## Invariants under test

Focused example tests plus a reproducible property matrix
(`GULAM_CHOR_VARIANTS` × player counts 2–6 × many seeds) assert:

- a fresh deck has 52 valid, unique card ids; exactly one configured card is
  removed before the deal;
- card conservation holds through dealing, drawing, and pair removal — no card is
  ever in two locations at once;
- the removed rank always has an **odd** count in play, every other rank an even
  count;
- a bot only acts on its own turn and never targets a self/non-active seat;
- finished (empty-handed) players are skipped;
- each accepted action advances `stateVersion` exactly once;
- identical options produce byte-identical results (determinism);
- 2–6 player games all terminate within the safety bound;
- the terminal state has exactly one loser, who holds the odd removed-rank card
  required by the active rule pack.

Property failures report their exact `rulePack/players/seed` label so any case is
instantly reproducible. fast-check was evaluated but skipped to avoid churning the
shared lockfile in the parallel-agent setup; seeded RNG already gives reproducible
cases.

## Integration contract for web/server

- The engine is **advisory** for bots: it returns a `BotDecision`; the
  **server** validates and applies it inside the authoritative, locked
  transaction (server-authoritative multiplayer — see
  [multiplayer authority](./multiplayer-authority.md)). Never trust a
  client-supplied bot action.
- The server owns humanized pacing (500–1200 ms) and the clock; the engine adds
  no delays.
- Provide a production `Rng` (crypto-backed) — never a seeded PRNG outside tests
  (see [security & privacy](./security-and-privacy.md)).
- `simulateGame` is for tests, tuning, and offline verification. It returns full
  `GameState`; when surfacing anything to a client, project through
  `projectPublic` / `projectPrivate` so no hidden hand leaks.
