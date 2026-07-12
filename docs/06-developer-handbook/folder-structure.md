# Folder Structure

The monorepo, and the rule for what goes where. Full tree in
[system-architecture](../05-architecture/system-architecture.md#monorepo-layout).

```text
lazy-patta/
  apps/
    web/        # Next.js — marketing + web app/PWA (thin: UI shell + routing)
    mobile/     # Expo RN — iOS/Android (thin: UI shell + native glue)
  packages/
    game-engine/    # pure rules engine (no UI/network/Supabase)
    game-contracts/ # shared wire/types: Card, RulePack, envelopes, snapshots
    shared-ui/      # design-system components (shadcn/Tailwind + RN mirror)
    design-tokens/      # tokens → CSS vars / Tailwind theme / RN JSON
    shared-types/   # cross-cutting types
    shared-utils/   # pure helpers
    localization/   # ICU messages (EN/GU/HI), keys, loaders
    test-fixtures/  # seeded decks + deterministic scenarios
  supabase/
    migrations/     # schema source of truth
    functions/      # Edge Functions (server-authoritative)
    seed.sql
  docs/             # this Product Bible
  .github/          # workflows, PR template, CODEOWNERS
```

## What goes where (the rules)

- **Business/game logic → `packages/`**, never in `apps/`. Apps are thin shells that
  render shared components and route.
- **Anything visual → `shared-ui` + `design-tokens`.** No raw hex/px/ms in app code.
- **Shared types/wire format → `game-contracts`/`shared-types`.** One definition,
  imported everywhere (including Edge Functions).
- **Server authority → `supabase/functions`**, importing `game-engine` +
  `game-contracts`.
- **Copy/strings → `localization`.** No hard-coded user-facing text in components.

## Feature-first organization within apps

Inside `apps/web` and `apps/mobile`, organize by **feature** (e.g. `features/lobby`,
`features/game-table`, `features/profile`), each owning its screens, hooks, and
feature-local composition — all built from `shared-ui` + `design-tokens`. Avoid
type-first buckets (`components/`, `hooks/`, `utils/` at the root) for feature code.

## Dependency rules (enforced)

- `game-engine` depends only on `game-contracts` (+ pure utils). **No UI, no I/O.**
- `shared-ui` depends on `design-tokens` (+ contracts for game components).
- `apps/*` depend on packages; **packages never depend on apps**.
- Import boundaries are enforced by lint rules ([coding-standards](./coding-standards.md)).

## Naming (files & dirs)

- Directories: `kebab-case` (`game-table/`). React components: `PascalCase.tsx`.
- Hooks: `useThing.ts`. Pure modules: `thing.ts`. Tests: `thing.test.ts` beside source.
- Token names, message keys, and error codes follow their own conventions (see
  [design-tokens](../02-design-system/design-tokens.md), [voice](../01-brand/voice-and-copywriting.md),
  [api-contracts](../05-architecture/api-contracts.md)).
