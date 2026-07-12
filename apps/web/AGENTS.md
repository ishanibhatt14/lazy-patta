# Web App Rules

## Scope

Allowed:

- `apps/web/**`
- Web-specific UI composition and routing

Forbidden unless explicitly assigned:

- Game engine internals
- Supabase migrations or RLS policy changes
- Mobile-only files
- Root dependency, workspace, lockfile, or CI changes

## Product and UI rules

- Build the actual app surface first, not marketing filler.
- Apps are thin shells: put reusable logic in packages and keep game rules out of the UI.
- Use design tokens and shared contracts; do not introduce raw visual values.
- Do not hard-code user-facing copy once a localization key exists or should be created.
- Preserve guest play for computer games.
- Never render opponent private card identities.
- Keep game table experiences responsive, accessible, and keyboard-friendly.

## Validation

Run relevant focused checks first, then:

```bash
pnpm --filter @lazy-patta/web lint
pnpm --filter @lazy-patta/web typecheck
pnpm --filter @lazy-patta/web build
```

When running a dev server in parallel with other agents, prefer port `3001` unless assigned another port.
