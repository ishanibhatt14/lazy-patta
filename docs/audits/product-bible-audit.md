# Product Bible Audit

**Date:** 2026-07-12 · **Scope:** all of `docs/` (sections 00–07) + root `README.md`
· **Auditor:** engineering review prior to Phase 0 scaffold.

This audit was run by reading the actual files (not a prior summary), a scripted
internal-link check, and terminology/consistency scans. Where a claim below says
"verified," a command was actually run and its output inspected.

---

## 1. Files reviewed

**51 markdown files** under `docs/` plus root `README.md`. Enumerated by
`find docs -name "*.md" | wc -l` → **51**.

| Section | Files |
|---------|-------|
| `00-product-bible` | README, decisions-log, glossary, principles, scope (index + core) |
| `01-brand` | README, voice-and-copywriting, illustration-and-texture, sound, mascot, visual-identity |
| `02-design-system` | README, design-tokens, color, typography, components, motion-and-animation, themes, accessibility |
| `03-ux-specification` | README, information-architecture, user-flows, screen-catalog, game-table-contract, responsive-and-platform |
| `04-games` | README, game-design-framework, gadha-chor, judgement, lal-satti |
| `05-architecture` | README, system-architecture, game-engine, multiplayer-authority, database-schema, api-contracts, security-and-privacy, deployment-and-cicd |
| `06-developer-handbook` | README, getting-started, folder-structure, coding-standards, testing-strategy |
| `07-product-strategy` | README, roadmap, monetization, analytics-and-kpis, marketing-and-aso, launch-checklist |

(Full list is the source of truth; the table groups them by section for readability.)

---

## 2. Link check (verified)

Scripted relative-link check. Bible proper (51 files) at audit start: **236 links,
0 broken**. Full tree including the new `audits/` + `adr/` docs (this pass):

```
273 links checked; 0 broken
```

Method: for every relative markdown link, resolve the path portion (stripping any
trailing `#anchor` fragment), skip external `http` / in-page `#` / `mailto` links, and
`normpath`-join against the file's directory; assert the target exists on disk.
**Result: 0 broken.** Anchor fragments are not
deep-validated (targets exist; specific `#heading` slugs are not asserted) — noted as
a low risk in §6.

---

## 3. Corrections made during audit

| # | Issue | Action taken |
|---|-------|--------------|
| C-1 | Package name drift: docs referenced `packages/ui-tokens` in some places, `packages/design-tokens` in others. Phase 0 locks `packages/design-tokens`. | Renamed `ui-tokens` → `design-tokens` across **6 files** (design-system/README, design-system/themes, developer-handbook/getting-started, coding-standards, folder-structure, architecture/system-architecture). Re-ran link check after: still 0 broken. |
| C-2 | Committed OS cruft: `.DS_Store` present at repo root and in `docs/`. | Removed and added to `.gitignore` as part of the Stage A commit (see decisions-log commit). |

No other automated rewrites were applied; everything else below is recorded as a
finding rather than silently changed, because it needs a decision or belongs in
Stage B.

---

## 4. Contradictions, gaps & divergences found

### G-1 — Pass-and-play is entirely absent from the doc suite (GAP)
`grep -rli "pass.and.play" docs/` → **no matches.** Pass-and-play (one device,
players hand it around) is being **locked as a guest mode** in this Stage A pass
(new decision D-12b), yet it appears in **no** IA node, screen in the catalog (32
screens, none for it), engine mode description, or analytics event. This is the
single largest coherence gap.
**Resolution in this pass:** locked in decisions-log (D-12 expanded); recorded as an
unresolved-question item (minimal IA/screen/engine/analytics threading deferred, not
invented here to avoid speculative docs per the standing directive); flagged as a
remaining risk (§6, R-1).

### G-2 — Semantic-token alias naming differs between docs and the Phase 0 spec
The design-system docs use aliases like `bg.canvas`, `surface`, `brand.primary`,
`brand.accent`, `game.felt`. The Phase 0 scaffold spec calls for
`background.canvas`, `surface.primary`, `action.primary`, `action.secondary`,
`game.table`. Base **primitive** colors agree exactly (Cream `#FFF7E8`, Maroon
`#7A1F2B`, Saffron `#F6A623`, Teal `#0F766E`, Felt `#1F6B4F`, Ink `#1F1B16`, Error
`#C62828`, White `#FFFFFF`). This is an **alias-layer naming** difference, not a
palette conflict.
**Resolution:** reconcile when authoring `packages/design-tokens` in Stage B — pick
one alias set and update whichever side loses. Recorded as unresolved-question UQ-2.
Not a blocker (theming is remap-only).

### G-3 — Package set: docs vs Phase 0 subset (DIVERGENCE, not conflict)
`system-architecture.md` / `folder-structure.md` list `shared-ui`, `shared-types`,
`shared-utils`. Phase 0 intentionally scaffolds a **narrower** set and adds
`eslint-config` + `typescript-config` tooling packages. This is a phased-rollout
divergence: the docs describe the target monorepo; Phase 0 builds a lean subset.
**Resolution:** note in ADR-0002 consequences and the audit; add the remaining
packages when first needed. No doc rewrite required. Recorded as UQ-3.

### G-4 — First-game spelling / aliases (KNOWN-OPEN, tracked)
`Gadha Chor` is canonical; `Gulam Chor` accepted as regional synonym (D-04, D-10
rule-pack id is `classic-gulam-chor`). Additional community spellings seen in the
wild — *Gaddha Chor*, *Donkey card game* — are not yet enumerated as search/alias
terms. Low impact (ASO/glossary only).
**Resolution:** add alias list at brand-asset/ASO time; tracked as D-04 open + UQ-4.

### G-5 — Rule-pack id vs canonical name mismatch (COSMETIC)
Canonical game name is `Gadha Chor` but the default rule-pack id is
`classic-gulam-chor`. Intentional (id uses the synonym) but worth an explicit note so
a future reader doesn't "fix" it. Recorded, no change.

---

## 5. Checks that PASSED (no issue found)

| Check | Result |
|-------|--------|
| Accidental gambling/casino presentation | **Clean.** Casino/gambling/betting terms appear **only** as explicit prohibitions or positioning contrasts (`grep` reviewed). No screen, currency, wager, or odds surface exists. |
| "All UI can be shared directly" anti-pattern | **Not present.** Architecture consistently says share **tokens, contracts, engine, logic, selected primitives** — RN mirrors the design system; apps are thin shells. No claim that web/mobile UI is shared wholesale. |
| Screens referenced but missing from catalog | None found. Report/block (30), account deletion (31), reconnect (21), rematch (24) all present. |
| Components referenced but absent from inventory | Spot-checked catalog components (`HandFan`, `PlayerSeat`, `TurnBanner`, `ReactionPicker`, `ResultCard`, `ReconnectOverlay`, `RoomCode`) against components.md — present. |
| Analytics events without a flow | Enumerated events (`guest_game_*`, `room_*`, `game_*`, `reconnect_*`, `rematch_*`) all map to catalogued flows/screens. **Exception:** no pass-and-play event (folds into G-1). |
| DB entities without ownership/retention | `game_player_private_state` RLS owner-only; `game_events` append-only + prune; account-deletion anonymization path defined. Covered. |
| Terminology consistency (Gaddo mascot, "jodi", "Tamaro varo") | Consistent across brand + UX docs. |
| Conflicting tech selections | None. Next.js/Vercel, Expo/Expo Router, Supabase, pnpm+Turborepo consistent throughout. |

---

## 6. Remaining risks

- **R-1 (medium):** Pass-and-play locked as a mode but unthreaded through IA / screen
  catalog / engine mode list / analytics. Must be threaded before that mode is built
  (Phase 1+), or it will be missed. Tracked: UQ-1.
- **R-2 (low):** Token **alias** naming reconciliation (G-2) is deferred to Stage B
  token authoring; if not reconciled there, docs and code drift. Tracked: UQ-2.
- **R-3 (low):** Link check validates file existence, not `#anchor` slugs. A renamed
  heading could leave a silently-wrong deep link. Tracked: UQ-5.
- **R-4 (low):** `shared-ui/types/utils` described but not built in Phase 0 (G-3);
  acceptable if the divergence is remembered when they're first needed.
- **R-5 (low):** Open product decisions (D-01 name, D-04 spelling, D-10 exact family
  variant, D-22 age rating, D-34 mobile launch, D-35 voice pack) remain owner
  sign-offs; defaults are in place so nothing is blocked.

---

## 7. Documentation coverage

- **Product/positioning:** covered (00, 01, 07). Non-casino hard line explicit.
- **Design system:** covered foundation-first (02) — tokens, color, type, components,
  motion, themes, a11y.
- **UX:** IA + flows + 32-screen catalog + game-table contract + responsive (03).
- **Games:** framework + Gadha Chor (MVP) + two roadmap games (04).
- **Architecture:** system, engine, multiplayer authority, DB, API contracts,
  security, CI/CD (05).
- **Handbook:** getting-started, folder-structure, coding-standards, testing (06).
- **Strategy:** roadmap, monetization, analytics, ASO, launch (07).
- **Gaps:** pass-and-play threading (G-1); token alias reconciliation is a Stage B
  task, not a doc gap.

---

## 8. Verification statement

Per the standing constraint — *do not claim a command/test/link-check passed unless
it was actually run* — the following were executed and their output inspected during
this audit: the file count (`find | wc -l` → 51), the internal link check (236 links,
0 broken, run both before and after the C-1 rename), the pass-and-play grep (no
matches), and the casino-term grep (prohibitions only). No build, deploy, or app test
is claimed — none was run in Stage A (that is Stage B).
