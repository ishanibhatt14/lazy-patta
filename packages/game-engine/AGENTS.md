# Game Engine Rules

## Scope

Allowed:

- `packages/game-engine/**`
- Engine-specific tests
- `packages/test-fixtures/**` only when explicitly assigned for deterministic scenarios

Forbidden unless explicitly assigned:

- React, Next.js, Expo, React Native, DOM, or browser APIs
- Supabase, auth, realtime, fetch, sockets, or other network requests
- App UI code under `apps/**`
- Root dependency, workspace, lockfile, or CI changes

## Engine invariants

- Keep the engine pure and deterministic.
- All randomness must be injected.
- Production shuffle and deterministic test shuffle must remain separate.
- Preserve card-conservation and uniqueness invariants.
- Preserve turn-order, legal-action, and terminal-state invariants with tests.
- Do not encode presentation state in engine state.
- Do not expose private card identities through public snapshots, logs, events, or errors.

## Validation

Run relevant focused tests first, then:

```bash
pnpm --filter @lazy-patta/game-engine lint
pnpm --filter @lazy-patta/game-engine typecheck
pnpm --filter @lazy-patta/game-engine test
```
