# ADR-0002 — Monorepo (pnpm + Turborepo) for web, mobile & shared packages

**Status:** Accepted (2026-07-12) · Locks decision D-51.

## Context

Lazy Patta ships a Next.js web app and an Expo React Native mobile app that must
share a single rules engine, wire contracts, design tokens, and localization. We need
one definition of these shared concerns consumed identically across platforms and the
server (Edge Functions), with fast, cache-aware builds.

## Decision

Use a **single-repo monorepo** managed by **pnpm workspaces** for dependency/linking
and **Turborepo** for task orchestration and caching — but only where task
orchestration adds clear value. Layout:

```
apps/       web (Next.js), mobile (Expo Router)
packages/   game-engine, game-contracts, design-tokens, localization,
            test-fixtures, eslint-config, typescript-config  (+ shared-ui/
            shared-types/shared-utils added when first needed)
supabase/   migrations, functions
```

Dependency direction points inward: `apps/*` → shared packages; `game-engine` →
`game-contracts` only; **packages never depend on apps**. Import boundaries are
lint-enforced.

## Alternatives considered

- **Separate repos per app + published shared packages.** Rejected: publish/version
  churn for tightly-coupled first-party code; slower iteration on the shared engine.
- **npm/yarn workspaces without Turborepo.** Rejected: loses task graph caching;
  Turbo's remote/local cache materially cuts CI time.
- **Nx.** Rejected: heavier than needed for this size; Turbo + pnpm is sufficient and
  lower-ceremony.

## Consequences

- **+** One source of truth for engine/contracts/tokens/i18n; atomic cross-cutting
  changes; cached builds.
- **+** Edge Functions import the _same_ engine as clients.
- **−** Monorepo tooling discipline required (boundary lint, version pinning).
- Phase 0 intentionally scaffolds a **subset** of packages and adds tooling packages
  (`eslint-config`, `typescript-config`); `shared-ui/types/utils` are created on first
  real use, not pre-built (UQ-3, "don't over-build").

## Verification method

`pnpm install` links the workspace; `turbo run build lint typecheck` succeeds across
apps and packages; an import-boundary lint rule fails a deliberately-added
`apps → packages` violation in reverse. Verified when Phase 0 CI runs green.
