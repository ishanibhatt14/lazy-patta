# Getting Started

> Written ahead of the code scaffold. Commands reflect the intended setup; they'll
> be finalized when `apps/` and `packages/` are created (see
> [architecture](../05-architecture/system-architecture.md)).

## Prerequisites

- **Node** (LTS) + **pnpm** (monorepo package manager / workspaces).
- **Docker** (for local Supabase).
- **Supabase CLI**.
- **Expo CLI / EAS** (mobile).
- A **Vercel** account (web deploys) and a **Supabase** project (backend).

## Install

```bash
pnpm install            # install all workspace deps
cp .env.example .env    # fill in local secrets (never commit .env)
```

## Run locally

```bash
# Backend (Supabase: Postgres, Auth, Realtime, Edge Functions)
supabase start
supabase db reset       # apply migrations + seed.sql

# Web app (Next.js)
pnpm --filter web dev

# Mobile app (Expo)
pnpm --filter mobile start
```

## Common tasks

```bash
pnpm lint               # eslint across workspaces
pnpm typecheck          # strict TS, all packages
pnpm test               # unit + property tests (Vitest)
pnpm test:e2e           # Playwright (web)
pnpm --filter game-engine test   # engine suite only (fast, run often)
```

## Environment variables

- Client-safe values use the framework's public prefix; **secrets stay server-side**
  (Edge Functions / Vercel / Supabase env). Never expose the service-role key.
- `.env.example` documents every required key; keep it current.

## First contribution path

1. Read [vision](../00-product-bible/01-vision-and-mission.md),
   [brand](../01-brand/brand-guidelines.md), and
   [design tokens](../02-design-system/design-tokens.md).
2. Pick up a task; branch per [git strategy](./git-strategy.md).
3. Build from **existing components/tokens** — extend the design system first if needed.
4. Add tests ([testing strategy](./testing-strategy.md)); keep the engine pure.
5. Open a PR; pass all CI gates; get review.

## Troubleshooting

- **Supabase won't start:** ensure Docker is running; `supabase stop && supabase start`.
- **Type errors across packages:** run `pnpm build` for `game-contracts`/`design-tokens`
  first (they're consumed by others).
- **Mobile can't reach backend:** use your machine's LAN IP, not `localhost`, for the
  device; check Expo env config.
