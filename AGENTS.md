# Lazy Patta Agent Rules

Lazy Patta is a premium, nostalgic Indian family card-game platform. It is **not
gambling** — no real-money stakes, wagering, or casino mechanics, ever.

## Source of truth

- The **Product Bible** lives in [`docs/`](docs/) — start at [`docs/README.md`](docs/README.md).
  Read the relevant section before editing (product decisions:
  [`docs/00-product-bible/`](docs/00-product-bible/), architecture:
  [`docs/05-architecture/`](docs/05-architecture/), locked decisions:
  [`docs/adr/`](docs/adr/) and [`docs/00-product-bible/decisions-log.md`](docs/00-product-bible/decisions-log.md)).
- Keep implementation aligned with the decisions log, architecture docs, and the
  area-specific `AGENTS.md` files (`apps/web`, `apps/mobile`, `packages/game-engine`, `supabase`).
- If documentation conflicts, the closest Product Bible section wins unless the
  user explicitly changes the decision.

## Non-negotiable architecture

- **Game-engine purity.** `packages/game-engine` is pure and deterministic: no
  `Math.random`, no `Date`/time, no I/O, no network, no persistence, and no
  framework imports. It may import **only** `@lazy-patta/game-contracts` and
  relative modules. RNG and clock are injected. This is enforced by
  `packages/game-engine/src/dependency-boundary.test.ts` (forbidden: `react`,
  `react-native`, `next`, `@supabase`/`supabase`, `node:fs`/`node:net`/`node:http`,
  `fs`/`http`/`https`, `axios`). Do not weaken that test to make code pass.
- **Server-authoritative multiplayer.** The client never decides game outcomes,
  deals, or validity. All authoritative state transitions happen server-side
  (ADR-0003). The client sends intents and renders server-confirmed state.
- **Private card state.** Never expose opponent card identities or any player's
  private hand to another client. Use opaque position tokens (ADR-0008); the
  server reveals only what a given player is entitled to see.
- **Design-token-only styling.** Reference semantic design tokens from
  `@lazy-patta/design-tokens`. Do not add raw hex/rgb colors, px/spacing, radii,
  shadows, or motion values in application code (ADR-0007).
- **Localization.** No string concatenation for user-facing copy. Add keys to all
  supported locales (en/gu/hi) in `@lazy-patta/localization`; the key-sync test
  enforces parity. Do not hardcode display strings in components once a surface
  is wired for i18n.
- **No casino / gambling presentation.** Never introduce wagering, betting,
  coins, chips-as-currency, jackpots, loot boxes, prize pools, or any real-money
  or casino-styled language or visuals. Guest mode (computer play) stays available.

## Approved package graph

Dependencies flow **apps → packages**, and within packages toward `game-contracts`.
Never introduce a reverse or cyclic edge (a package must not import an app).

| Package                   | May depend on                                                    |
| ------------------------- | ---------------------------------------------------------------- |
| `packages/game-contracts` | (leaf — shared types only, no runtime deps)                      |
| `packages/game-engine`    | `game-contracts` only (`test-fixtures` in tests)                 |
| `packages/test-fixtures`  | `game-contracts` (seeded RNG + rule packs for tests)             |
| `packages/design-tokens`  | (leaf — cross-platform token contract)                           |
| `packages/localization`   | (leaf — ICU messages for en/gu/hi)                               |
| `packages/auth`           | provider-agnostic interfaces (no concrete provider SDK leakage)  |
| `apps/web` (Next.js)      | `design-tokens`, `localization`, (later) `game-contracts`/engine |
| `apps/mobile` (Expo)      | `design-tokens`, `localization`, (later) `game-contracts`/engine |
| `supabase`                | migrations + RLS policies + verification tests                   |

## Prohibited dependencies

- Anything on the game-engine forbidden list above (UI, network, I/O, Supabase).
- Concrete auth/provider SDKs imported outside `packages/auth` or the app edge.
- New shared/runtime dependencies added without the platform owner's sign-off.
- Do not upgrade shared dependencies or edit lockfiles unless you own that scope.

## Security and privacy

- Secrets live only in server-side environment variables. Never commit `.env` or
  credentials; never log or persist OTP values, provider tokens, or card hands.
- Every user-accessible table has Row-Level Security; owner-scope through
  `auth.uid()` (see `supabase/` and `docs/05-architecture/security-and-privacy.md`).
- Service-role operations must never be reachable from the anonymous/client key.
- Treat any external input (client payloads, third-party responses) as untrusted;
  validate at the boundary. Do not introduce injection/XSS-prone patterns.

## Required commands

Run from the repo root (Node 22 LTS via `.nvmrc`, pnpm 10):

```bash
pnpm install --frozen-lockfile   # deterministic install
pnpm lint                        # ESLint, zero warnings
pnpm format:check                # Prettier
pnpm typecheck                   # tsc --noEmit across the workspace
pnpm test                        # Vitest (engine invariants, tokens, i18n, RLS)
pnpm check-links                 # internal docs link/anchor validation
pnpm build                       # web production build
```

Mobile (`apps/mobile`): `npx expo-doctor`, `npx expo export --platform android|ios`.
Supabase RLS behavioral suite: `pnpm supabase:start && pnpm test:rls && pnpm supabase:stop`.

## Parallel-agent coordination

- Work only in the assigned branch and Git worktree. Before editing, run:

```bash
pwd
git branch --show-current
git status --short --branch
git log --oneline -3
git worktree list
```

- Stop if the directory, branch, or worktree does not match the assignment.
- Never switch branches inside an assigned worktree.
- Never run `git reset`, `git rebase`, `git merge`, `git clean`, or force-push
  unless explicitly requested.
- Do not modify files outside your ownership scope. Only one active agent owns a
  shared hotspot at a time: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `turbo.json`, `.github/workflows/**`, `tsconfig` files,
  `packages/game-contracts/**`, `packages/design-tokens/**`, `supabase/migrations/**`.
- Do not assume another agent's unmerged work exists. Consume only contracts
  present in your branch; if one is missing, document the need rather than
  inventing a competing contract.

## Definition of done

- Lint, format check, typecheck, and the relevant tests were **actually executed**
  and pass. **Never claim a command passed unless it was run.** If the environment
  cannot run something (e.g. Docker/Supabase, device builds), mark it clearly as
  **unverified** — do not imply it passed.
- Changes stay within scope; no unrequested refactors, dependencies, or files.
- Report: files changed, exact commands run, package versions, warnings,
  remaining limitations, and any dependency on another agent's PR.

## Pull requests

- Keep commits focused and conventional.
- Open **draft** PRs unless explicitly told otherwise. Never merge your own PR.
