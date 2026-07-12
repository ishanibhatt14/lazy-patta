# Testing Strategy

The engine is chance-driven and the multiplayer is trust-critical, so tests focus
where correctness matters most: **rules, fairness, privacy, and reconnection.**
Tooling: **Vitest** (unit/property), **Playwright** (web e2e), **Maestro/Detox**
(mobile e2e).

## The pyramid

```
        e2e (web Playwright / mobile Maestro|Detox)   ← few, critical journeys
     integration (auth + RLS, rooms, actions, reconnect)
   property-based (invariants across random inputs)
  unit (engine reducers, components)                  ← many, fast
```

## Unit

- **Deck composition** and removed card (51 cards; exactly one unpairable removed-rank).
- **Shuffle invariants** (all cards present, no dup IDs, distribution) with seeded RNG.
- **Deal distribution** for 2–6 players.
- **Pair detection/removal** (initial + on-draw), suit-agnostic.
- **Turn skipping** (finished players) and direction.
- **End-game detection** + correct Gadha Chor identification.
- **Rule-pack variants** (removedRank, direction, turnSeconds, player counts).
- **Components:** states/variants, a11y labels, reduced-motion fallbacks.

## Property-based (invariants)

Run over many random seeds/action sequences:

- **Card-count conservation** across every action.
- **No duplicate card IDs**, ever.
- **Exactly one** unmatched removed-rank card remains at game end.
- **`state_version` increments exactly once** per accepted action.

## Integration

- **Auth + RLS:** a user can read only their own private state; **no path returns
  another player's hand**.
- **Create/join/start room**; host-only controls enforced.
- **Concurrent action conflict** (version conflict handling under row lock).
- **Idempotent retry** (same `clientActionId` → one effect).
- **Disconnect/reconnect** mid-turn without card leakage; **bot replacement** after grace.
- **Account deletion** removes/anonymizes the right rows and revokes tokens.

## End-to-end

- **2-, 4-, and 6-player** full matches (web + mobile).
- **Slow network, airplane-mode interruption, app restart** → safe resume.
- **Gujarati & Hindi** layout overflow; **screen-reader** and **reduced-motion** flows.
- **Guest → play vs computer** happy path in ≤ 3 taps.

## Accessibility & i18n testing

- Automated contrast + a11y lint; pseudo-loc and **200%-text** visual snapshots.
- Manual passes: keyboard-only, VoiceOver/TalkBack, colorblind sim, senior mode
  ([accessibility](../02-design-system/accessibility.md)).

## Security testing (release gates)

- **Hand-secrecy test:** assert no client (API or Realtime) can obtain opponent card
  identities — a **hard release gate** ([security](../05-architecture/security-and-privacy.md)).
- RLS policy tests; rate-limit tests; secret/dependency scans in CI.

## Determinism & fixtures

- Seeded RNG + golden scenarios in `packages/test-fixtures`: same seed + actions ⇒
  identical state. Regressions in the engine show up as fixture diffs.

## What we don't over-test

- Trivial glue and thin app shells get light coverage; the depth goes to the engine,
  authority path, privacy, and reconnection — the places a bug would actually hurt
  families or fairness.

## CI wiring

All suites run per PR as gates; see
[deployment-and-cicd](../05-architecture/deployment-and-cicd.md).
