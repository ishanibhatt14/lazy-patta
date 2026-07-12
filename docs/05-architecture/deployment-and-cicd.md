# Deployment & CI/CD

Ship safely and often. Web on **Vercel**, backend on **Supabase**, mobile via
**EAS (Expo)**, automation via **GitHub Actions**.

## Environments

| Env            | Web                                   | Backend                                    | Mobile                    |
| -------------- | ------------------------------------- | ------------------------------------------ | ------------------------- |
| **Local**      | `next dev`                            | Supabase local (Docker) + `seed.sql`       | Expo dev client           |
| **Preview**    | Vercel preview per PR                 | Supabase staging                           | EAS internal (as needed)  |
| **Staging**    | Vercel (staging)                      | Supabase staging (migrations auto-applied) | EAS internal / TestFlight |
| **Production** | Vercel prod (`play.lazytraveler.app`) | Supabase prod (migrations w/ approval)     | App Store / Play (staged) |

Secrets live only in each platform's env store (Vercel/Supabase/EAS), never in the repo.

## CI — on every pull request

- **lint** + **typecheck** (strict TS across all packages)
- **unit + property tests** (engine is the priority suite)
- **database migration validation** (migrations apply cleanly on a fresh DB)
- **web build** (Next.js)
- **Expo config validation** (mobile builds are configured correctly)
- **Playwright smoke tests** (critical web flows)
- **security:** dependency + secret scanning; RLS/anti-cheat gate tests
- **a11y/i18n:** contrast checks + pseudo-loc / 200%-text visual snapshots

A PR is mergeable only when all gates pass ([testing strategy](../06-developer-handbook/testing-strategy.md)).

## CD — on merge to main

- **Web:** deploy Vercel preview → production.
- **Supabase:** apply migrations to **staging**, then **production with approval**.
- **Mobile:** create **EAS internal builds**; upload **source maps** to error monitoring.

## Release

- **iOS:** TestFlight → App Store (staged rollout).
- **Android:** Google Play internal testing → staged rollout.
- **Feature flags** gate live multiplayer and notifications so they can be enabled
  independently of a store release.
- Whether iOS + Android launch simultaneously is
  [decision D-34](../00-product-bible/decisions-log.md) (open).

## Migration discipline

- `supabase/migrations/` is the **schema source of truth**; no manual prod DDL.
- Migrations are **forward-only** and reviewed; destructive changes require explicit
  sign-off and a backup/rollback note.
- RLS policies ship **with** the tables they protect.

## Observability

- Error monitoring with **source maps** (web + mobile).
- Product analytics events + operational metrics
  ([analytics-and-kpis](../07-product-strategy/analytics-and-kpis.md)).
- Alerts on Edge Function error rate, action latency p95, reconnect success, and
  state-version conflict rate.
- **Never** log hands, provider tokens, or OTP values.

## Branch & deploy safety

- `main` is protected; merges require green CI + review (CODEOWNERS).
- Production DB migrations and store submissions are **approval-gated** — no
  unattended destructive changes.
- Rollback: Vercel instant rollback for web; forward-fix migrations for DB; EAS/store
  rollback via previous build / staged-rollout halt.
