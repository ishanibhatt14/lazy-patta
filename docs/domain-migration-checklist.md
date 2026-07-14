# Domain migration & deep-link activation checklist

Migrating the Lazy Patta web app to **https://lazypatta.com** as the single
canonical public domain, and preparing for future iOS/Android deep links.

This document is the manual companion to the repository-side work. The engineer
agent implemented everything in code; the items below require dashboard access
and are the owner's to perform.

- **Brand:** Lazy Patta
- **Descriptor:** Desi Indian Card Games
- **Canonical domain:** https://lazypatta.com (apex, canonical)
- **Defensive secondary:** https://lazypatta.games (redirects to canonical)
- **Old preview host:** https://lazy-patta-web.vercel.app (kept as platform
  alias, never advertised as canonical)

> The agent did **not** purchase any domains or change any registrar/DNS
> settings. The owner purchases domains and configures DNS and all dashboards.

---

## What is implemented in code (no manual step)

| Area                                                | Where                               |
| --------------------------------------------------- | ----------------------------------- |
| Central site config + build-time URL validation     | `apps/web/lib/site-config.ts`       |
| `metadataBase`, canonical, OG/Twitter, appleWebApp  | `apps/web/app/layout.tsx`           |
| Homepage title/description + WebSite JSON-LD        | `apps/web/app/page.tsx`             |
| Per-game canonical + hreflang alternates            | `apps/web/lib/game-discovery.ts`    |
| `sitemap.xml` (canonical public pages only)         | `apps/web/app/sitemap.ts`           |
| `robots.txt` (private/API disallowed)               | `apps/web/app/robots.ts`            |
| Alias path redirects (308)                          | `apps/web/next.config.mjs`          |
| Canonical room-invite links → `/join/<code>`        | `apps/web/lib/room-invite.ts`       |
| `/download` (env-gated store badges)                | `apps/web/app/download/page.tsx`    |
| `/privacy`, `/terms`, `/support`, `/delete-account` | `apps/web/app/*`                    |
| Universal Link / App Link association files         | `apps/web/app/.well-known/*`        |
| Expo associated domains + Android intent filters    | `apps/mobile/app.json`              |
| Auth redirect pinned to canonical origin            | `apps/web/lib/auth/redirect-url.ts` |

### Redirects implemented in code vs. configured in Vercel

- **In code (`next.config.mjs`), permanent 308 — path aliases on the same host:**
  - `/games/gulam-chor`, `/games/gulaam-chor`, `/games/gaddha-chor`,
    `/games/jack-thief` → `/games/gadha-chor`
  - `/games/badam-saat`, `/games/badam-satti`, `/games/seven-of-hearts` →
    `/games/lal-satti`
- **In Vercel (host-level redirects) — must be configured in the dashboard:**
  - `www.lazypatta.com` → `lazypatta.com`
  - `lazypatta.games`, `www.lazypatta.games` → `lazypatta.com` (path preserved)
  - `play.lazytraveler.app` → `lazypatta.com` (path preserved), if attached

---

## 1. Vercel domain setup (manual)

Project: the Lazy Patta web project.

1. Add domains: `lazypatta.com`, `www.lazypatta.com`, `lazypatta.games`,
   `www.lazypatta.games` (and `play.lazytraveler.app` if it should redirect here).
2. Set **`lazypatta.com` as the Primary** domain.
3. Configure redirects to the primary:
   - `www.lazypatta.com` → `lazypatta.com`
   - `lazypatta.games` → `lazypatta.com`
   - `www.lazypatta.games` → `lazypatta.com`
   - `play.lazytraveler.app` → `lazypatta.com` (if attached)
4. Add the exact **DNS records Vercel displays** at Namecheap (A/ALIAS/CNAME as
   shown — do not guess static IPs).
5. Set env vars in the Vercel project (Production + Preview as appropriate):
   - `NEXT_PUBLIC_SITE_URL=https://lazypatta.com`
   - `NEXT_PUBLIC_SUPPORT_EMAIL=support@lazypatta.com`
6. Confirm: SSL issued, apex works, `www` redirects, secondary domains redirect,
   paths are preserved, and preview deployments remain usable.

---

## 2. Supabase auth callback config (manual, dashboard)

- **Site URL:** `https://lazypatta.com`
- **Allowed redirect URLs:**
  - `https://lazypatta.com/**`
  - `https://*.vercel.app/**` — only if you intentionally want preview logins
  - `lazypatta://auth/callback` — for the future mobile app
- Do not weaken redirect validation beyond what you actually use.

Code already derives the browser auth redirect from the canonical origin on
production hosts (`apps/web/lib/auth/redirect-url.ts`); preview/localhost still
round-trip on their own origin.

---

## 3. Google Search Console (manual)

1. Add a **Domain property** for `lazypatta.com`.
2. Verify via the **DNS TXT** record.
3. Submit `https://lazypatta.com/sitemap.xml`.
4. Inspect the homepage and both game pages
   (`/games/gadha-chor`, `/games/lal-satti`).
5. Request indexing after launch.
6. If `play.lazytraveler.app` was indexed as a real public site, verify both old
   and new properties and use Google's **Change of Address / site move** process.
7. Monitor: indexing, canonical selection, redirects, Core Web Vitals, search
   queries, mobile usability.
8. Do **not** submit alias/redirect domains as separate content sites.

---

## 4. Universal Links / Android App Links activation (manual, later)

The association files at `/.well-known/apple-app-site-association` and
`/.well-known/assetlinks.json` are **generated from environment variables** and
return **404 until configured** (so no bogus placeholder ever ships).

When native builds exist, set these env vars in Vercel and redeploy:

- `APPLE_TEAM_ID`
- `IOS_BUNDLE_ID`
- `ANDROID_PACKAGE_NAME`
- `ANDROID_SHA256_CERT_FINGERPRINT`

Validate after deploy:

- `curl -sI https://lazypatta.com/.well-known/apple-app-site-association`
  → `200`, `content-type: application/json`, **no redirect**.
- `curl -s https://lazypatta.com/.well-known/assetlinks.json | jq .`
- Apple: https://search.developer.apple.com/appsearch-validation-tool/
- Android: https://developers.google.com/digital-asset-links/tools/generator

Expo/EAS (mobile):

- `apps/mobile/app.json` already declares `applinks:lazypatta.com` and Android
  intent filters for `/join`, `/play`, `/games`.
- Set the iOS `bundleIdentifier` and Android `package` in EAS/build config when
  the owner supplies them (kept out of the repo to avoid shipping fake IDs).
- Expected behavior: app installed → opens the target screen; not installed →
  opens the web page.

---

## 5. Migration safety

**Before cutover:** domain purchased · DNS configured · SSL active · production
deploy healthy · canonical metadata verified · sitemap verified · robots
verified · auth callbacks updated · support/privacy URLs working · room links
tested · no redirect loops.

**At cutover:** attach `lazypatta.com` · set primary · enable permanent
alternate-domain redirects · update Search Console · submit sitemap · test old
links · test social previews · test login · test room invites.

**After cutover:** monitor 404s, redirect errors, auth failures, indexing, Core
Web Vitals. Retain redirects indefinitely (≥ 12 months minimum). Keep the old
Vercel alias for platform internals but never expose it as canonical.

---

## 6. Localization roadmap (English / Gujarati / Hindi)

Planned indexable URL model (game overview routes already localized in code):

```
/en/games/gadha-chor   /gu/games/gadha-chor   /hi/games/gadha-chor
/en/games/lal-satti    /gu/games/lal-satti    /hi/games/lal-satti
```

- Localized game routes exist (`apps/web/app/[locale]/games/[slug]`) with
  reciprocal `en`/`gu`/`hi`/`x-default` hreflang alternates.
- The new legal/support/download pages are authored in English for now;
  translating them is a documented follow-up (add keys to all three catalogues in
  `packages/localization/src/messages` — the key-sync test enforces parity).

---

## 7. Remaining manual steps (summary)

- [ ] Purchase `lazypatta.com` and `lazypatta.games`.
- [ ] Add domains in Vercel and set `lazypatta.com` primary.
- [ ] Configure Namecheap/Vercel DNS from the records Vercel shows.
- [ ] Set `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_SUPPORT_EMAIL` in Vercel.
- [ ] Configure host redirects (www + `.games` + `play.lazytraveler.app`).
- [ ] Update Supabase Site URL + allowed redirect URLs.
- [ ] Set up `support@lazypatta.com` mailbox (MX records).
- [ ] Verify Google Search Console + submit sitemap.
- [ ] Later: provide Apple Team ID, iOS bundle ID, Android package name, SHA-256
      fingerprint; set the deep-link env vars; validate `.well-known` files.
- [ ] Later: set `NEXT_PUBLIC_IOS_APP_STORE_URL` / `NEXT_PUBLIC_GOOGLE_PLAY_URL`.
