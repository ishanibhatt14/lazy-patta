# Coding Standards

Production quality, from day one. No placeholder code; no untracked TODOs; strong
typing; SOLID; clean architecture; feature-first.

## TypeScript

- **Strict mode on**, everywhere. No implicit `any`; prefer precise types and unions
  over loose objects.
- **Type the boundaries.** Wire format lives in `game-contracts` and is the single
  source of truth for client + server (see [api-contracts](../05-architecture/api-contracts.md)).
- Prefer **discriminated unions** for states/actions (game state machine, action
  envelopes) over booleans/flags.
- No `ts-ignore` without a linked issue and a one-line reason.

## Architecture principles

- **SOLID + clean architecture.** Dependencies point inward: pure domain
  (`game-engine`) at the center; UI and I/O at the edges.
- **Pure core.** The engine and shared utils are pure and deterministic — no I/O, no
  `Math.random()`, no time reads without injection ([game-engine](../05-architecture/game-engine.md)).
- **UI renders state.** Components are declarative projections of state; they don't
  own game rules.
- **Feature-first** organization inside apps ([folder-structure](./folder-structure.md)).

## Design-system-only rule (enforced)

- **No raw hex, px, or ms in components.** Use tokens (`design-tokens`). A lint rule
  fails PRs that hard-code visual values.
- **No one-off UI in screens.** Compose [components](../02-design-system/components.md);
  if something's missing, add it to `shared-ui` first, then use it.
- **No hard-coded user-facing strings.** Use `localization` ICU keys.

## Component conventions

- Typed props (the contract in [components](../02-design-system/components.md)).
- Every interactive component: 48×48 target, visible focus, a11y label, disabled +
  loading where async ([accessibility](../02-design-system/accessibility.md)).
- Animations via motion tokens with reduced-motion fallbacks.
- Keep components small and composable; lift shared logic into hooks/packages.

## The "don't over-build" rule

- Build what the task needs — no speculative abstractions, no premature generality.
  (The **framework** generality we _do_ invest in is the rule-pack engine and design
  system, because those are proven load-bearing — everything else stays lean.)
- No dead code, no backwards-compat shims for code that doesn't exist yet.

## Comments & docs

- Default to **no comments**; write a short one only when the _why_ is non-obvious
  (a constraint, an invariant, a subtle anti-cheat rule).
- Public package APIs get concise doc comments on exported types/functions.
- TODOs must link to a tracked issue, or they don't ship.

## Errors & logging

- Fail loudly server-side; return **stable error codes** to clients
  ([api-contracts](../05-architecture/api-contracts.md)).
- **Never log** hands, provider tokens, or OTP. Use `requestId` for correlation.
- Validate at boundaries (user input, external APIs); trust internal pure code.

## Security-by-default

- Server-authoritative always; clients never hold hidden state.
- Parameterized queries / RLS; secrets only server-side.
- Watch OWASP top-10 classes; fix insecure code immediately when spotted.

## Tooling (enforced in CI)

- **ESLint** (incl. import-boundary + no-raw-token rules) + **Prettier**.
- **tsc --strict** typecheck.
- **Vitest** (unit/property), **Playwright** (web e2e).
- Pre-merge gates in [deployment-and-cicd](../05-architecture/deployment-and-cicd.md).
