# Game Design Framework

The reusable structure every Lazy Patta game plugs into. It exists so that the
**engine, UI, and multiplayer are game-agnostic**: a game contributes _rules and
content_, not a new codebase. This is the game-side equivalent of the design
system's "define once, compose many."

## Core tenets

1. **Rule-pack-driven.** Family variants differ, so a game's behavior is described
   by a **configurable rule pack**, not hard-coded logic. Changing player count,
   direction, or the removed card is config, not code.
2. **UI-independent engine.** The engine controls shuffle, deal, legal moves, turn
   order, win/lose, and bots. **UI only renders state** and requests actions.
3. **Server-authoritative.** The server owns shuffle, card identity, turn validity,
   and results. Clients never decide truth (see
   [multiplayer authority](../05-architecture/multiplayer-authority.md)).
4. **Deterministic & testable.** Seeded RNG in tests; cryptographic RNG in
   production. Pure reducers: `(state, action) → state'`.

## What a game must define

| Contract | Description |
|----------|-------------|
| **Rule pack** | Typed config (see below) with sane defaults + allowed ranges |
| **Setup** | Deck composition, removals, deal distribution |
| **Legal moves** | Given a state + actor, what actions are valid |
| **Reducer** | Apply an accepted action → next state + emitted events |
| **Turn model** | Order, direction, skipping finished players, timeouts |
| **End condition** | How the game completes; who wins/loses; scoring |
| **Bot policy** | How a bot picks a legal action + humanized pacing |
| **View projections** | Public snapshot + each player's private view (no leakage) |
| **Content** | Localized copy, tutorial steps, animation hooks, sounds |

## Shared engine surface (game-agnostic)

The engine (see [architecture](../05-architecture/game-engine.md)) provides, once:

- deck + crypto/seeded shuffle, dealing, and card-identity management,
- turn manager (order/direction/skip/timeout),
- action envelope validation, versioning, and idempotency,
- public/private **state projection** (RLS-friendly),
- bot runner with humanized delays,
- event log emission.

A game supplies a module implementing the contracts above; the engine runs it.

## Rule-pack model (shape)

Each game defines a typed rule pack. Shared fields + game-specific fields. Example
(Gadha Chor) — full types in [game-contracts](../05-architecture/api-contracts.md):

```ts
interface RulePack {
  id: string;                 // e.g. 'classic-gulam-chor'
  gameId: string;             // 'gadha-chor'
  minPlayers: number;
  maxPlayers: number;
  direction: 'clockwise' | 'counterclockwise';
  turnSeconds: number | null; // null = untimed
  // ...game-specific fields (e.g. removedRank, pairing, autoRemovePairs)
}
```

Rule packs are **named and versioned** so a family can pick "our variant" and so
saved games remain reproducible.

## GDD template

Every game doc (`04-games/<game>.md`) uses this outline:

1. **Overview & fantasy** — what it is, the feeling, why families love it.
2. **Players & materials** — counts, deck, removals.
3. **Rules** — setup, turn, win/lose, edge cases.
4. **Rule-pack config** — fields, defaults, allowed ranges, named variants.
5. **State machine** — game + player states, events.
6. **Bot behavior** — policy + pacing + difficulty roadmap.
7. **Scoring & stats** — what's tracked (never currency).
8. **Tutorial / how-to-play** — first-run teaching flow.
9. **Animations & sound** — hooks into the design system.
10. **Accessibility notes** — game-specific a11y.
11. **Test matrix** — unit/property/integration/e2e cases.

## Roadmap games (backlog outlines)

These are captured now to prove the framework generalizes; full GDDs come with the
[roadmap](../07-product-strategy/roadmap.md):

- **Lal Satti** — sequence/collection game; different setup + end condition, same engine.
- **Judgement (Kachuful)** — trick-taking with bidding; adds trump + bid phases +
  round scoring. Exercises trick/score subsystems.
- **Mendicot** — partnership trick-taking (teams). Exercises team scoring.
- **3-2-5 (Teen Do Paanch)** — trick-taking with fixed target tricks.
- **Bluff (Bluff/Cheat)** — deception game; adds hidden-claim + challenge mechanic
  and preset-reaction integration.

Trick-taking games (Judgement/Mendicot/3-2-5) share a **trick engine** added to the
shared layer once, then reused — the same design-system-first payoff, applied to logic.
