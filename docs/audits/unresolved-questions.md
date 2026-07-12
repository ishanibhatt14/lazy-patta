# Unresolved Questions

Open items surfaced by the [product-bible-audit](./product-bible-audit.md) and
[traceability-matrix](./traceability-matrix.md). Each has a **recommended default**
so no work is blocked, an **owner/milestone**, and a **resolution path**. These are
deliberately _not_ resolved by inventing new speculative documents now (per the
standing directive to not expand the Bible yet).

Status: 🔴 needs decision · 🟡 default in place, confirm later · 🟢 resolved

---

## UQ-1 — Pass-and-play is unthreaded through the doc suite 🔴

**Context:** Pass-and-play is locked as a guest mode (decisions-log D-12b) but has no
user flow, no screen in the 32-screen catalog, no "hand the device over" component,
no IA node, and no analytics event. Engine already supports it (local multi-human
loop).
**Impact:** medium. If not threaded before the mode is built, it will be missed or
built ad-hoc, violating the design-system-first rule.
**Recommended default:** reuse game-table screens 16–19 with a lightweight
"pass to {next player}" interstitial that hides the hand between turns; add events
`passplay_game_started` / `passplay_game_completed`.
**Owner / milestone:** product + design, **before Phase 1 game UI** (not Phase 0).
**Resolution path:** add one flow + one screen + one component + two events when the
mode is scheduled; update traceability row 2 to fully-traced.

## UQ-2 — Semantic-token alias naming (docs vs Phase 0 spec) 🟡

**Context:** docs use `bg.canvas / surface / brand.primary / brand.accent /
game.felt`; Phase 0 spec uses `background.canvas / surface.primary / action.primary /
action.secondary / game.table`. Primitive palette values agree exactly.
**Impact:** low. Alias-layer only; theming is remap-only so components are unaffected
once one naming wins.
**Recommended default:** adopt the **Phase 0 spec names** in
`packages/design-tokens` (they read more conventionally: `background/surface/action/
game/text/status`), then update the design-system docs to match in a follow-up doc
pass.
**Owner / milestone:** engineering, **during Stage B token authoring**.
**Resolution path:** author tokens once, add a token-name validation test, reconcile
docs.

## UQ-3 — `shared-ui` / `shared-types` / `shared-utils` not built in Phase 0 🟡

**Context:** architecture/folder-structure docs describe these packages; Phase 0
scaffolds a narrower subset and adds `eslint-config` + `typescript-config`.
**Impact:** low. Phased rollout, not a conflict.
**Recommended default:** add each package when a real consumer needs it; do not
pre-create empty shells (respects the "don't over-build" rule).
**Owner / milestone:** engineering, **as needed post-Phase 0**.
**Resolution path:** note in ADR-0002 consequences; create on first use.

## UQ-4 — First-game spelling & alias list 🟡

**Context:** `Gadha Chor` canonical; `Gulam Chor` accepted synonym (rule-pack id
`classic-gulam-chor`). Community spellings _Gaddha Chor_, _Donkey card game_ not yet
enumerated for search/ASO/glossary.
**Impact:** low (discoverability only).
**Recommended default:** keep `Gadha Chor` canonical; collect the alias set at
brand-asset/ASO time.
**Owner / milestone:** brand + ASO, **before store listing** (D-01/D-04 sign-off).
**Resolution path:** add alias list to glossary + ASO keywords.

## UQ-5 — Link check does not validate `#anchor` slugs 🟡

**Context:** the audit's link checker asserts target _files_ exist (236 links, 0
broken) but does not verify that `#heading` fragments resolve.
**Impact:** low. A renamed heading could leave a silently-wrong deep link.
**Recommended default:** accept file-level checking for now; add anchor validation to
the CI docs-lint step in Stage B.
**Owner / milestone:** engineering, **Stage B CI**.
**Resolution path:** extend the link-check script to parse headings → slugs and
assert fragments.

---

## Known-open product decisions (carried from decisions-log)

These already have defaults in the docs; listed here for a single view. See
[decisions-log](../00-product-bible/decisions-log.md).

| ID   | Question                           | Default                                | Confirm by                    |
| ---- | ---------------------------------- | -------------------------------------- | ----------------------------- |
| D-01 | Final product name                 | Lazy Patta                             | before brand asset production |
| D-04 | Exact Gadha Chor family spelling   | Gadha Chor                             | before brand assets           |
| D-10 | Exact Gujarati family rule variant | `classic-gulam-chor`                   | before engine fixtures frozen |
| D-22 | Age rating (13+ vs Kids Category)  | 13+, not Kids                          | before store account setup    |
| D-34 | Simultaneous iOS+Android launch    | Android internal + TestFlight parallel | before Phase 4                |
| D-35 | Gujarati recorded voice pack scope | SFX first, voice later                 | before Phase 2 audio          |
