# Git Strategy

Lightweight, trunk-based, safe. Optimized for a small team shipping often behind
feature flags.

## Branches

- **`main`** is always releasable and **protected** (green CI + review required).
- **Short-lived feature branches** off `main`: `feat/…`, `fix/…`, `chore/…`,
  `docs/…`, `refactor/…`, `test/…`.
- Merge back via PR; delete the branch after merge. Avoid long-lived divergent branches.
- Ship incomplete-but-safe work behind **feature flags**
  ([deployment](../05-architecture/deployment-and-cicd.md)) rather than mega-branches.

## Commits

- **Conventional Commits:** `type(scope): summary`
  (`feat(game-engine): add initial pair removal`).
- Small, focused, buildable commits; imperative mood; explain the _why_ in the body
  when non-obvious.
- Never commit secrets, `.env`, or large binaries. Add specific files, not `git add -A`.

## Pull requests

- Keep them small and reviewable; one logical change per PR.
- PR description: what & why, screenshots for UI, test plan, linked issue.
- **All CI gates must pass** (lint, typecheck, unit/property, migrations, web build,
  Expo config, Playwright smoke, security, a11y/i18n).
- At least one review; **CODEOWNERS** required for sensitive areas (engine, auth,
  migrations, security).

## Review checklist (reviewers)

- [ ] Uses tokens/components/localization — no raw values or one-off UI.
- [ ] Engine changes stay pure + fully tested (unit + property).
- [ ] Server-authoritative & anti-cheat invariants preserved (no hand leakage).
- [ ] A11y: targets, focus, SR labels, reduced-motion, 200% text.
- [ ] EN/GU/HI strings via ICU keys; no hard-coded copy.
- [ ] Migrations forward-only + RLS included; no destructive change without sign-off.
- [ ] Tests added/updated; no untracked TODOs.

## Protected operations

- No force-push to `main`; no unattended destructive git/DB ops.
- Migrations to prod and store submissions are **approval-gated**.
- Hooks are never skipped (`--no-verify`) without explicit, documented reason.

## Releases & tags

- Tag releases (`vX.Y.Z`) on `main`; changelog generated from Conventional Commits.
- Web deploys continuously; mobile releases are cut deliberately
  ([release-process](./release-process.md)).
