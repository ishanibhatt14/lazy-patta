---
name: decisions-log
description: Locked product/design/tech decisions with rationale; the tiebreaker when docs disagree
metadata:
  type: reference
---

# Decisions Log

Every load-bearing decision lives here with its rationale and status. When a
decision changes, update it here **first**, then propagate to the affected docs.
Open decisions are flagged `❓ NEEDS OWNER SIGN-OFF` — these carry a recommended
default so work is never blocked, but should be confirmed before the relevant
milestone.

Status: ✅ locked · 🟡 default (proceed, confirm later) · ❓ open

---

## Brand & positioning

| ID   | Decision            | Choice                                                                                                                     | Status | Rationale                                                                                                                                       |
| ---- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | Product name        | **Lazy Patta** (descriptor: _Desi Card Games_)                                                                             | 🟡     | Repo, domain, and all discussion use it. Alternative "Lazy Party Games" broadens scope but loses the card-game specificity and the desi warmth. |
| D-02 | Positioning         | Family card games, **not** casino/gambling                                                                                 | ✅     | Core differentiator and a hard store-compliance line.                                                                                           |
| D-03 | Franchise           | Part of the **Lazy** ecosystem, separate repo/deploy                                                                       | ✅     | Shared brand equity without codebase coupling.                                                                                                  |
| D-04 | First game spelling | **Gadha Chor** canonical; accept _Gulam Chor_, _Gaddha Chor_, _Donkey card game_ as synonyms/aliases (search/ASO/glossary) | 🟡     | "Gadha" (donkey) carries the mascot and the gentle-loser joke. Confirm the exact family spelling; alias list finalized at ASO time (UQ-4).      |

## Gameplay

| ID   | Decision                       | Choice                                                                                                                                                                             | Status | Rationale                                                                                                                                                     |
| ---- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-10 | Default rule pack              | `classic-gulam-chor`: 52-card deck, remove one Jack at random, deal all 51, auto-remove same-rank pairs, draw clockwise from next active player, last holder of the odd Jack loses | 🟡     | Matches the provided spec. Engine is **rule-pack-driven** so family variants are config, not rewrites. Confirm the exact family variant.                      |
| D-11 | Player count                   | 2–6 (1 human + 1–5 bots vs computer)                                                                                                                                               | ✅     | Fits a family table and screen layout.                                                                                                                        |
| D-12 | Guest computer & pass-and-play | Two offline guest modes **without login**: (a) **vs computer** (bots), (b) **pass-and-play** on one device                                                                         | ✅     | Lowest-friction path to the "aha"; both run the same client-side engine. Login gated only for live rooms + identity. Pass-and-play UX threading tracked UQ-1. |
| D-13 | Bot intelligence (MVP)         | Random valid draw, humanized 500–1200ms delay                                                                                                                                      | ✅     | Game is chance-driven; AI coach/heuristics are post-MVP.                                                                                                      |

## Accounts & compliance

| ID   | Decision          | Choice                                                                             | Status | Rationale                                                                               |
| ---- | ----------------- | ---------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| D-20 | Auth methods      | Email OTP/magic link everywhere; Apple on iOS; Google on Android/web; no passwords | ✅     | Familiar, low-friction, store-compliant.                                                |
| D-21 | Login requirement | Bots: guest OK · Live rooms + profile/stats: login required                        | ✅     | Conversion-friendly; protects identity features.                                        |
| D-22 | Age positioning   | General audience **13+**, not Kids Category                                        | 🟡     | Avoids Kids Category constraints while staying family-safe. Confirm before store setup. |
| D-23 | Account deletion  | In-app **and** public web page `/delete-account`                                   | ✅     | Store requirement; also builds trust.                                                   |
| D-24 | Chat              | Preset reactions only; **no** free text or voice in MVP                            | ✅     | Safety-by-default for a family + kids audience.                                         |

## Platform & delivery

| ID   | Decision                 | Choice                                                                  | Status | Rationale                                                                   |
| ---- | ------------------------ | ----------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| D-30 | Web stack                | Next.js on Vercel (web + marketing + PWA)                               | ✅     | Matches Lazy ecosystem; fast to ship.                                       |
| D-31 | Mobile stack             | Expo React Native + Expo Router                                         | ✅     | Shared TS engine across web/iOS/Android.                                    |
| D-32 | Backend                  | Supabase (Auth, Postgres, Realtime, Storage, Edge Functions)            | ✅     | Server-authoritative multiplayer with RLS.                                  |
| D-33 | First release surface    | **Web computer-mode MVP first**, then live rooms, then mobile packaging | ✅     | De-risks by shipping something playable early.                              |
| D-34 | Simultaneous iOS+Android | Undecided                                                               | ❓     | Recommend Android internal + TestFlight in parallel; final call at Phase 4. |
| D-35 | Gujarati voice pack      | Sound effects first; recorded voice pack later                          | 🟡     | Voice pack is high-delight but not launch-critical. Confirm at Phase 2.     |

## Theming

| ID   | Decision        | Choice                                              | Status | Rationale                                                                             |
| ---- | --------------- | --------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| D-40 | MVP theme       | **Classic Cream** (light) is the production default | ✅     | Warmest, most on-brand; dark ("Night Table") and festival themes layer on via tokens. |
| D-41 | Festival themes | Diwali first, token-swap only (no layout change)    | 🟡     | Proves the theming system; seasonal delight without rebuilds.                         |

---

## Foundation locks (Stage A · 2026-07-12)

Fifteen load-bearing decisions locked at the close of the Product Bible audit, before
the Phase 0 scaffold. Each engineering decision is backed by an ADR under
[`docs/adr/`](../adr/); several reaffirm and consolidate earlier product decisions so
Phase 0 builds against one settled set.

| ID   | Decision                 | Choice                                                                                                                 | Status | ADR / ref                                                                         |
| ---- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| D-50 | Repository strategy      | **Separate Lazy Patta repo**, own deploy; share brand equity only                                                      | ✅     | [ADR-0001](../adr/0001-separate-lazy-patta-repository.md) · D-03                  |
| D-51 | Monorepo & tooling       | **pnpm workspaces + Turborepo**; apps `web`/`mobile` + shared packages                                                 | ✅     | [ADR-0002](../adr/0002-monorepo-for-web-mobile-shared-packages.md)                |
| D-52 | Multiplayer model        | **Server-authoritative**; engine runs in Edge Functions; only server result is truth                                   | ✅     | [ADR-0003](../adr/0003-server-authoritative-multiplayer.md)                       |
| D-53 | Backend platform         | **Supabase** (Auth, Postgres, Realtime, Storage, Edge Functions), RLS everywhere                                       | ✅     | [ADR-0004](../adr/0004-supabase-auth-database-and-realtime.md) · D-32             |
| D-54 | Play modes & auth gating | **Guest computer + pass-and-play offline; authenticated private rooms** for live play                                  | ✅     | [ADR-0005](../adr/0005-guest-play-and-authenticated-private-rooms.md) · D-12/D-21 |
| D-55 | Rule packs               | **Versioned, typed rule packs**; new game/variant = config, not a rewrite                                              | ✅     | [ADR-0006](../adr/0006-versioned-game-rule-packs.md) · D-10                       |
| D-56 | Design tokens            | **Tokens are the cross-platform contract** (CSS vars / Tailwind / RN JSON / Figma); no raw hex/px/ms in components     | ✅     | [ADR-0007](../adr/0007-design-tokens-as-cross-platform-contract.md)               |
| D-57 | Hidden state             | **Private card state server-side + opaque, short-lived position tokens**; clients never hold/forge hidden state        | ✅     | [ADR-0008](../adr/0008-private-card-state-and-opaque-position-tokens.md)          |
| D-58 | Pure game engine         | **One pure, deterministic, UI-independent engine** (`packages/game-engine`), injected RNG, shared client+server        | ✅     | [game-engine](../05-architecture/game-engine.md)                                  |
| D-59 | Type safety              | **TypeScript strict everywhere**; `game-contracts` is the single wire-format source of truth                           | ✅     | [coding-standards](../06-developer-handbook/coding-standards.md)                  |
| D-60 | Design-system-first      | **No screen is "done" until expressed purely in tokens + shared components**; missing pieces added to the system first | ✅     | [02 · design-system](../02-design-system/README.md)                               |
| D-61 | Non-casino hard line     | **No gambling, wagering, real/virtual currency, or casino styling** — ever                                             | ✅     | D-02                                                                              |
| D-62 | Localization             | **EN / GU / HI via ICU MessageFormat**; semantic keys; no concatenated fragments; key-sync enforced in CI              | ✅     | [localization](../05-architecture/system-architecture.md)                         |
| D-63 | Accessibility baseline   | **WCAG AA**, 48×48 targets, never color-only, no drag-only, reduced-motion, 200% text, all three scripts               | ✅     | [accessibility](../02-design-system/accessibility.md)                             |
| D-64 | First release surface    | **Web computer-mode MVP first**, then live rooms, then mobile packaging                                                | ✅     | D-33                                                                              |

---

## Open decisions needing sign-off

These should be confirmed by the milestone noted; defaults are already in the docs
so nothing is blocked.

- **D-01 / D-04** — Final name and Gadha Chor spelling _(before brand asset production)._
- **D-10** — Exact Gujarati family rule variant _(before engine test fixtures are frozen)._
- **D-22** — Age rating _(before store account setup)._
- **D-34** — Simultaneous mobile launch _(before Phase 4)._
- **D-35** — Voice pack scope _(before Phase 2 audio work)._

_Last updated: 2026-07-12_
