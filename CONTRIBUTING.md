# Contributing to Lazy Patta

Lazy Patta is a premium, nostalgic Indian family card-game platform. It is **not
gambling** — no real-money stakes, wagering, or casino mechanics, ever. Keep that
constraint in mind for every change.

## Prerequisites

- **Node 20** (see [`.nvmrc`](.nvmrc)) — `nvm use`
- **pnpm 9** — `corepack enable pnpm`

## Getting started

```bash
pnpm install
```

## Everyday commands

All commands run from the repo root and fan out across the workspace via Turborepo.

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `pnpm dev`          | Run every app's dev server (Next.js web, Expo mobile)               |
| `pnpm lint`         | ESLint across all packages/apps (zero warnings allowed)             |
| `pnpm typecheck`    | `tsc --noEmit` across all packages/apps                             |
| `pnpm test`         | Vitest suites (engine invariants, tokens, i18n key-sync, RLS shape) |
| `pnpm build`        | Production build (web)                                               |
| `pnpm check-links`  | Validate all internal Markdown links + anchors in `docs/`           |
| `pnpm format`       | Prettier write                                                      |

Run a single project with a filter, e.g. `pnpm --filter @lazy-patta/web build`.

## Repository layout

```
apps/
  web/            Next.js web/PWA shell
  mobile/         Expo Router mobile shell
packages/
  game-contracts/ Shared types (cards, rule packs, actions, envelopes)
  game-engine/    Pure, deterministic engine (no I/O, no framework imports)
  test-fixtures/  Seeded RNG + rule packs for tests
  design-tokens/  Cross-platform token contract (CSS vars, Tailwind, RN)
  localization/   ICU messages for en/gu/hi with key-sync
  auth/           Provider-agnostic auth interfaces
  eslint-config/  Shared ESLint config
  typescript-config/ Shared tsconfig bases
supabase/         Migrations (RLS-enabled) + structural verification test
docs/             Product Bible, ADRs, audits
```

## Ground rules

- **The engine is pure.** No `Math.random`, no time, no I/O, no framework imports
  in `packages/game-engine`; a dependency-boundary test enforces this. Inject RNG.
- **No raw hex/px in components.** Reference semantic design tokens only.
- **No string concatenation for copy.** Add keys to all three locales; the
  key-sync test enforces parity.
- **Secrets live only in server env vars.** Never commit `.env`; never store card
  hands, provider tokens, or OTP values.
- **RLS on every user-accessible table.** Owner-scope through `auth.uid()`.

## Scope

The repository is currently at **Phase 0 (foundation)**. The full game UI and
multiplayer runtime are intentionally not implemented yet — see
[`docs/adr/`](docs/adr/) for the locked architectural decisions.
