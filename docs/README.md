# Lazy Patta — Product Bible

> **Ghar ni ramato. Badha sathe.**
> _The card games we grew up playing._

This is the single source of truth for **Lazy Patta**, a family-friendly Indian
card-game platform launching with **Gadha Chor**. It is written **before** app
development begins so that every screen, component, and system is built from a
shared, deliberate blueprint rather than assembled screen-by-screen.

Lazy Patta is **not** a gambling app. No cash, no betting, no prize pools, no
transferable coins, no casino presentation. The emotional target is simple:

> Not _"this is another Teen Patti app,"_
> but _"this feels like playing cards at my grandparents' house."_

---

## How this documentation is organized

The docs are ordered the way the product should be built: **brand and design
system first**, then games, experience, engineering, and go-to-market. Every
screen and component downstream references the tokens and rules defined upstream.

| #   | Section                                        | What it answers                                         | Status                                  |
| --- | ---------------------------------------------- | ------------------------------------------------------- | --------------------------------------- |
| 00  | [Product Bible](./00-product-bible/)           | Why this exists, who it's for, how we win, when we ship | 🟢 v1 complete                          |
| 01  | [Brand](./01-brand/)                           | How it looks, sounds, and speaks; the mascot            | 🟢 v1 complete                          |
| 02  | [Design System](./02-design-system/)           | Tokens, components, motion, themes, accessibility       | 🟢 v1 complete                          |
| 03  | [UX Specification](./03-ux-specification/)     | Information architecture, flows, every screen           | 🟢 v1 complete                          |
| 04  | [Games](./04-games/)                           | Rules, rule packs, bots, scoring, tutorials             | 🟢 Gadha Chor complete; others outlined |
| 05  | [Architecture](./05-architecture/)             | Engine, data, API, multiplayer authority, security      | 🟢 v1 complete                          |
| 06  | [Developer Handbook](./06-developer-handbook/) | Repo layout, standards, git, testing, releases          | 🟢 v1 complete                          |
| 07  | [Product Strategy](./07-product-strategy/)     | Roadmap, monetization, analytics, ASO, launch           | 🟢 v1 complete                          |

Legend: 🟢 complete · 🟡 in progress · ⬜ planned

> **Status:** the full Product Bible v1 is written and ready to build against.
> Full-GDD expansion for Lal Satti / Judgement and Figma asset production are the
> next documentation steps; app code begins at Phase 0 of the
> [roadmap](./07-product-strategy/roadmap.md).

---

## The Lazy ecosystem

Lazy Patta is one product in a small, deliberately-related family of **"Lazy"**
consumer apps. Each ships from its **own repository and deployment** but shares a
quality bar and design philosophy so the brand becomes recognizable over time.

```
Lazy ecosystem
├── Lazy Traveler   — AI trip planner            (live)
├── Lazy Patta      — Indian family card games   (this repo)
└── Future          — Lazy Recipes · Lazy Events · Lazy Kids
```

Lazy Patta reuses the existing `lazytraveler.app` domain via
`play.lazytraveler.app` for the MVP web/PWA surface. Cross-promotion between Lazy
products is allowed and encouraged; a shared codebase is **not** — unrelated
products stay in independent repos.

---

## Product at a glance

|                     |                                                                     |
| ------------------- | ------------------------------------------------------------------- |
| **Product name**    | Lazy Patta — Desi Card Games                                        |
| **First game**      | Gadha Chor (a.k.a. Gulam Chor)                                      |
| **Primary surface** | `play.lazytraveler.app` (web/PWA), then iOS + Android via Expo      |
| **Audience**        | Gujarati & Indian families in IN / US / CA / UK, and the diaspora   |
| **Modes**           | Play vs computer (guest OK) · Private online rooms (login required) |
| **Languages**       | English, ગુજરાતી (Gujarati), हिन्दी (Hindi)                         |
| **Never**           | Cash, betting, wagering, coins, loot boxes, casino styling          |

---

## Reading order for new contributors

1. [Vision & Mission](./00-product-bible/01-vision-and-mission.md) — why we're building this.
2. [Brand Guidelines](./01-brand/brand-guidelines.md) — the feeling we're protecting.
3. [Design Tokens](./02-design-system/design-tokens.md) — the atoms everything is built from.
4. [Component Inventory](./02-design-system/components.md) — the reusable building blocks.
5. [Gadha Chor GDD](./04-games/gadha-chor.md) — the first game, end to end.
6. [Developer Handbook](./06-developer-handbook/getting-started.md) — how to run and contribute (once code exists).

---

## Governance

- **Decisions log:** [00-product-bible/decisions-log.md](./00-product-bible/decisions-log.md)
  records locked choices and their rationale. Change a decision there, then ripple
  it outward — never silently diverge in a single doc.
- **Source spec:** this Bible supersedes and expands the original
  `Lazy_Patta_End_to_End_Product_Design_Technical_Spec_v1` and the Figma Make
  prompt. Where they conflict, the Bible wins.
- **Design-system-first rule:** no screen is "done" until it is expressed purely
  in terms of tokens and components defined in section 02. If a screen needs
  something new, add it to the design system first, then use it.

_Last updated: 2026-07-12 · Version 2.0 (Product Bible)_
