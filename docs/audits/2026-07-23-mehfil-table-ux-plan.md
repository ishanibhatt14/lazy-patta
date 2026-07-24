# Mehfil Table — UX Audit Response & Staged Redesign Plan

**Date:** 2026-07-23 · **Trigger:** external UX audit ("Mehfil Table" direction)
· **Status:** living plan (unlike the dated Bible audits, this is edited as slices land)

An external reviewer audited the live app and proposed a "modern Indian family
game night" redesign (teal-led _Mehfil Table_ theme, Quick Play first, immersive
table, per-game identity). This doc **reconciles that audit against the actual
codebase**, records what already shipped, discards stale advice, and sequences the
rest into reviewable, design-system-first slices.

Guardrails that bound every slice below:

- **Design-system-first.** No raw colors or one-off UI in a route. New visuals land
  in `@lazy-patta/design-tokens` / `02-design-system` first, then screens compose them.
  (ADR-0007: tokens are the cross-platform contract.)
- **Non-casino, non-negotiable.** No coins, chips, betting, "win big," or casino
  styling. Reward = rematch, improvement, family teasing, shareable memory.
- **SEO route stability.** Do not rebuild on a temp domain or churn public routes.
  `/`, `/mobile`, `/games/*`, `/*/how-to-play/*` and their metadata stay put; we
  replace the interface _inside_ them.
- **Every slice ships tested** (typecheck + lint + vitest + prettier) and as its own
  Conventional Commit.

---

## 1. Reconciliation — the audit was run against a pre-launch build

The audit's central thesis — _"the first CTA leads to a Rooms page that says coming
soon, creating disappointment before a working game"_ — described the **old** state.
Three fixes have since shipped:

| Audit finding                                                 | Status                                                                                                                                                                                  | Commit    |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Rooms are a coming-soon dead end                              | **Fixed** — family rooms verified live; `/mobile/rooms` renders the real create/join hub; `privateRoom`/`onlinePlayable` = `available` across all registries; server start-guard passes | `dc13c18` |
| Install prompt should be earned, shown once                   | **Done + extended** — earned, one-tap dismiss, now iOS-Safari aware and suppressed when already installed; also offered in the rooms flow                                               | `e5b82dd` |
| Make Quick Play the first CTA; no primary CTA into a dead end | **Done** — mobile home leads with one-tap Quick Play (`&quick=1` deals from the tile); rooms demoted to a secondary row                                                                 | `4a05dbd` |

### Stale advice to explicitly ignore

- "Replace the homepage room CTA with a 'Family rooms are being prepared' card"
  (audit §4, §11) — **the opposite of what shipped.** Rooms are live; keep them live.
- The audit's `:root { --primary… }` raw-CSS palette block is the right _direction_
  but the **wrong mechanism** — the retheme is one change in the token package, not
  per-route CSS (see Slice T).

---

## 2. Valid, still-open findings → slices

Each slice notes **overlap** with already-completed PRs, so we _audit-and-close-gaps_
rather than rebuild. (PR5 wired 4 immersive shells; PR7 shipped results/series; PR9
rematch/sharing/lobby; PR10 settings/telemetry — treat these as "verify against the
audit, then polish," not greenfield.)

### Slice T — Mehfil Table theme tokens

- **Goal:** teal-led palette with marigold as a _small warm accent_ (not dominant
  panels), warm-cream canvas, felt table surface, faint rangoli/jaali pattern at
  2–4% opacity.
- **Where:** `@lazy-patta/design-tokens` (`02-design-system/design-tokens.md` +
  token source). Screens inherit automatically.
- **Guardrails:** never marigold behind small white text; contrast-check every pair;
  keep the existing evening-teal/classic-cream theme switch working.
- **Risk:** visible everywhere at once → snapshot/visual QA across home, table, rooms.
- **Overlap:** none (pure token layer). **Est:** 1–2 days.

### Slice D — Game detail + per-game identity

- **Goal:** a real detail step (name, "also known as," 15-sec explainer, players/time/
  difficulty, Play-computer + Family-room, rules preview, "best for," recent settings),
  reusing existing public-site game copy — not a second inconsistent description.
  Give each game an accent identity (Gadha Chor playful, Lal Satti structured, Jhabbu
  fast, Kachuful thoughtful).
- **Overlap:** the `GameCatalogGrid` bottom sheet already offers Quick Play / Change
  settings / Create room / How-to-play — decide **enhance-sheet vs. dedicated route**
  before building (avoid redundancy). Per-game accent must be a token set, not ad-hoc.
- **Est:** 2–3 days.

### Slice S — Setup that feels like a table, not a form

- **Goal:** visual bottom-sheet/panel over the table bg; avatar-group player counts;
  meaningful difficulty (Relaxed/Balanced/Sharp) with selected state via
  background+border+checkmark (never color alone); tutorial-hints/speed/sound/house-
  rules; sticky CTA above safe-area reading "Deal the cards."
- **Overlap:** `MobileComputerSetupPage` + `MobileComputerGameSetup` exist (PR5 fold);
  this is a visual/interaction upgrade, and `quick=1` fast-start already works.
- **Est:** 2–3 days.

### Slice G — Gameplay table polish

- **Goal:** active-player glow, valid cards lift / invalid muted, selected card rises
  8–12px, played card flies to table, suit/trump always visible, "your turn" via
  visual+sound+optional haptic, hide app bottom-nav during play, pause/rules/sound/
  leave only. 44–48px targets. Animate `transform`/`opacity` only.
- **Overlap:** significant — PR5 (card interaction) + `game-table-contract.md` already
  define much of this. **Slice = audit live table against the contract, close gaps.**
- **Est:** 3–5 days (largest visual investment).

### Slice L — Waiting lobby warmth

- **Goal:** table-shaped seat layout, host crown, ready states, pulsing empty seats,
  big Share Invite, quick reactions (👋😂❤️🔥) and preset phrases ("Kem cho?",
  "Ready?"), reconnection state.
- **Overlap:** PR9 shipped rematch/invitation/result sharing + a lobby slice — verify
  what exists; likely additive (reactions, seat visuals). **Est:** 2–4 days.

### Slice R — Results with a takeaway

- **Goal:** win/lose states with one useful observation ("held the seven of hearts six
  turns"), Play again / Try harder / Share. No coins.
- **Overlap:** PR7 shipped game-specific results/series/Play Again — this is likely
  **polish + the "one observation" line**, not new. **Est:** 1–2 days.

### Slice E — Learn as a visual handbook

- **Goal:** search, continue-learning, difficulty filters, 30-sec rule cards with real
  card diagrams, glossary (suit/trick/trump/Thulla/bid), regional names, EN/GU/HI, and
  an interactive teaching turn feeding into a short bot game.
- **Overlap:** current Learn is a flat directory; rules copy exists on public pages to
  reuse. **Est:** 3–5 days.

### Slice A — Accessibility & responsive

- **Goal:** high contrast, larger cards/text, color-blind-friendly suits + always-show
  suit letters, turn notifications, reduced-motion removing nonessential movement;
  tablet two-column + navigation rail, desktop rail + keyboard shortcuts, phone-
  landscape full-screen table. INP ≤ 200ms.
- **Overlap:** settings scaffold (PR10) has language/theme/reduced-motion; extend.
  `responsive-and-platform.md` already specifies breakpoints. **Est:** 3–5 days.

---

## 3. Suggested sequence

1. **T** (tokens) — unblocks the look of everything; low logic risk.
2. **D** (detail + per-game identity) — needs T's accents.
3. **S** (setup) — flows from D.
4. **G** (table) — biggest payoff; independent of D/S.
5. **R** (results) — quick polish after G.
6. **L** (lobby) — social layer.
7. **E** (learn) and **A** (accessibility) — parallelizable polish.

Total ≈ **17–29 focused days**. This is why it ships as slices, each reviewable, not
one automated burst.

## 4. Open decisions (need a call before the relevant slice)

- **Slice D:** enhance the existing catalog **bottom sheet**, or add a dedicated
  `/mobile/game/<slug>` detail **route**? (Affects SEO surface + navigation depth.)
- **Slice T:** exact accent hexes per game, and whether per-game accents become full
  token _themes_ or a single accent variable each.
- **Global:** confirm the four per-game personalities/accents in §"identity" are the
  intended emotional targets (they must stay on the non-casino, grandparents'-table
  side).

## 5. Out of this plan (owner: you)

- Delete the orphaned Supabase project `zwvztxbjkgvfrgvceiom` (CLI TTY blocked the agent).
- Post-deploy 2-device check: create → join → **Start game** → play a full hand to
  confirm live card sync (room health still hard-codes `realtime:false`).
- Background security item: bump Next.js ≥ 16.2.11 (GHSA-6gpp-xcg3-4w24).
