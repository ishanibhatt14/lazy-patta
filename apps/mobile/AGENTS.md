# Mobile App Rules

## Scope

Allowed:

- `apps/mobile/**`
- Mobile-specific Expo, React Native, navigation, and native glue

Forbidden unless explicitly assigned:

- Game engine internals
- Supabase migrations or RLS policy changes
- Web-only files
- Root dependency, workspace, lockfile, or CI changes

## Product and UI rules

- Keep mobile as a thin shell over shared contracts, shared UI patterns, tokens, and localization.
- Do not put authoritative game rules in screens or hooks.
- Use design tokens through the approved React Native token surface.
- Preserve guest play for computer games.
- Never render opponent private card identities.
- Respect safe areas, dynamic text, reduced motion, and accessible touch targets.
- Avoid platform-specific divergence unless it improves native usability without changing game behavior.

## Validation

Run relevant focused checks first, then:

```bash
pnpm --filter @lazy-patta/mobile lint
pnpm --filter @lazy-patta/mobile typecheck
```

When running Expo in parallel with other agents, use an assigned port and document it in your status.
