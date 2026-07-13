# Deploying to Vercel

How Lazy Patta's web app reaches a public URL. There are two tiers; pick per goal.

- **Tier A — UI-only preview (no backend).** Deploy with *no* Supabase env vars.
  Home screen, computer play, tutorial, and gallery work; online play shows a
  friendly "not configured" notice by design. Nothing below the "Tier A" line is
  needed.
- **Tier B — full online multiplayer.** Requires a **hosted Supabase project**
  (the local `127.0.0.1:54321` is unreachable from Vercel). This is the rest of
  the doc.

The app is `apps/web` (Next.js 16, App Router) inside a pnpm + turbo monorepo.

---

## Tier A — UI-only

1. In Vercel, **Add New → Project** and import the GitHub repo.
2. **Root Directory:** `apps/web`. Framework auto-detects as **Next.js**.
3. **Node.js Version:** 22.x (repo requires `>=22.13`).
4. Leave build/install commands default — Vercel detects `pnpm@10.34.5` from the
   root `packageManager` field and installs the workspace.
5. Deploy. Set **no** environment variables.

Every branch push now gets its own **preview URL**; the production branch (default
`main`) publishes to the production domain. The logo hero and icons are served
from `apps/web/public/images/` (see `assets/images/README.md`).

---

## Tier B — full online multiplayer

### 1. Create the hosted Supabase project

1. supabase.com → **New project**. Choose a region near your players; save the DB
   password.
2. From **Project Settings → API**, copy:
   - **Project URL** — `https://<ref>.supabase.co`
   - **anon public** key (browser-safe)
   - **service_role** key (server-only — bypasses RLS; treat as a secret)

### 2. Push the schema (also the clean forward-migration test)

The Supabase CLI is already a dev dependency. From the repo root:

```bash
pnpm supabase login                      # once
pnpm exec supabase link --project-ref <ref>
pnpm exec supabase db push               # applies 0001 → 0006 in order
```

Because the project is brand new, `db push` runs every migration from scratch —
this is the definitive proof the migration set is forward-clean (local dev had
0006 applied additively, so this is the real check).

Then verify the result with the read-only check script — every row must read
`PASS` (migrations applied, tables + RLS, authority tables server-only, RPCs
`SECURITY DEFINER` and not client-executable):

```bash
psql "$SUPABASE_DB_URL" -f supabase/verify/hosted-schema-check.sql
```

Or paste `supabase/verify/hosted-schema-check.sql` into the Supabase **SQL editor**.

### 3. Configure hosted Auth (email OTP)

`supabase/config.toml` values are **local-only**; set the hosted equivalents in the
dashboard under **Authentication**:

- **URL Configuration → Site URL:** your production Vercel URL
  (e.g. `https://lazy-patta.vercel.app`).
- **Additional Redirect URLs:** add your Vercel preview wildcard so preview
  deploys can complete sign-in:

  ```text
  https://*-<team-or-account-slug>.vercel.app/**
  ```

  Replace `<team-or-account-slug>` with your Vercel team (or personal account)
  slug. The trailing `/**` matches any path under each preview host.
- **Email provider:** enabled; the app uses **one-time codes** (no password).
- ⚠️ The built-in Supabase email sender is **heavily rate-limited** (a few
  messages/hour) — fine for a demo, but configure **custom SMTP** before real use.

### 4. Create the Vercel project

Same as Tier A steps 1–4 (Root Directory `apps/web`, Next.js, Node 22.x).

### 5. Set environment variables (Vercel → Settings → Environment Variables)

Apply to **Production** and **Preview** (and Development if you use `vercel dev`):

| Name | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Browser-safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | Browser-safe; RLS-scoped |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | Server-only |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **Server-only. Mark sensitive. NEVER prefix `NEXT_PUBLIC_`, never log.** |

The authority route handlers (`/api/rooms/[roomId]/start`,
`/api/games/[gameId]/action`) read `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` at
runtime; `admin-client.ts` throws if it ever loads in the browser, so the
service-role key stays server-side. Absent the public vars, online play falls back
to the "not configured" notice rather than crashing.

### 6. Deploy & smoke-test (Phase 3 exit criteria)

Push the branch or promote to production, then on the live URL:

1. Home + logo render; language switch works.
2. Sign in with an email OTP code.
3. Create a private room; join from a **second device/browser** via the code.
4. Host starts; play a full round.
5. **Confirm no card leakage** — no request exposes another player's hand or the
   full `game_authority_state`. This is the multi-device exit gate.

---

## Operational notes

- **Preview isolation:** all preview deploys point at the *one* hosted Supabase
  project unless you adopt Supabase branching / per-branch projects. Acceptable
  for now; revisit before inviting outside testers.
- **Rollback:** Vercel supports instant rollback to a previous deployment. Database
  migrations are **forward-only** — never hand-edit a shipped migration; add a new
  one.
- **Secrets:** the service-role key lives only in Vercel's server env. It is never
  committed (`.env.local` is git-ignored; see `.env.example`) and never logged.
