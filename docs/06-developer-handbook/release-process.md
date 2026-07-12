# Release Process

How a change reaches families, safely and reversibly.

## Web (continuous)

1. PR merges to `main` (green CI + review).
2. Vercel builds a **preview**, then promotes to **production**
   (`play.lazytraveler.app`).
3. New backend behavior stays behind **feature flags** until deliberately enabled.
4. **Rollback:** Vercel instant rollback to the previous deployment.

## Backend / database

1. Migrations merge to `main` → auto-applied to **staging**.
2. Production migrations are **approval-gated**; forward-only, with a rollback note
   for anything destructive ([deployment](../05-architecture/deployment-and-cicd.md)).
3. Edge Functions deploy alongside the migrations they depend on.

## Mobile (deliberate)

1. Cut a release from `main`; bump version.
2. **EAS** builds → **TestFlight** (iOS) and **Play internal testing** (Android).
3. QA the release build on a **low-end Android device** (performance floor) and iOS.
4. Submit for review with the **demo account/mode** and store materials
   ([launch-checklist](../07-product-strategy/launch-checklist.md)).
5. **Staged rollout**; halt/roll back on crash-rate or error-rate regressions.
6. iOS+Android simultaneity is [decision D-34](../00-product-bible/decisions-log.md).

## Feature flags

- **Live multiplayer** and **notifications** are flag-gated so they can be turned on
  independently of a store release and rolled back instantly if needed.
- Flags are removed once a feature is stable (no permanent flag debt).

## Versioning

- Semantic version tags (`vX.Y.Z`) on `main`; changelog from Conventional Commits.
- Web and mobile can version independently; shared packages are versioned within the
  monorepo.

## Release checklist (per release)

- [ ] All CI gates green (incl. hand-secrecy + a11y/i18n).
- [ ] Migrations reviewed, forward-only, RLS included.
- [ ] Feature flags set correctly for this release.
- [ ] Smoke test on web + iOS + low-end Android.
- [ ] EN/GU/HI core flows verified.
- [ ] Account creation + deletion verified end to end.
- [ ] Error monitoring + source maps uploaded.
- [ ] Rollback path confirmed.

Definition-of-done for the MVP milestone itself lives in
[07 · launch-checklist](../07-product-strategy/launch-checklist.md).
