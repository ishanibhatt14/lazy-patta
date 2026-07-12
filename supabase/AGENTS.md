# Backend Rules

## Scope

Allowed:

- `supabase/**`
- Backend tests under `supabase/src/**`
- `packages/auth/**` only when explicitly assigned
- `packages/game-contracts/**` only when explicitly assigned

Forbidden unless explicitly assigned:

- Web or mobile presentation code
- Design tokens
- Game engine internals beyond consuming published contracts
- Root dependency, workspace, lockfile, or CI changes

## Security and authority

- Enable RLS on every client-accessible table.
- Clients must never directly update authoritative game state.
- Presence is not authoritative game state.
- Every game action must be idempotent and version-checked.
- Test policies using two distinct authenticated users.
- Never expose another player's private hand.
- Use opaque position tokens or public snapshots for hidden card state.
- Keep migrations forward-only and reviewable.

## Validation

Run relevant focused checks first, then:

```bash
pnpm --filter @lazy-patta/supabase lint
pnpm --filter @lazy-patta/supabase typecheck
pnpm --filter @lazy-patta/supabase test
```

Only the backend worktree should run local Supabase services, because default ports can conflict.
