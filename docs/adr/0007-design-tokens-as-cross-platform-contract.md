# ADR-0007 — Design tokens as the cross-platform contract

**Status:** Accepted (2026-07-12) · Locks decision D-56 / D-60.

## Context

The same visual language must render identically on Next.js (web/PWA), Expo React
Native (mobile), and in Figma, and must support theming (Classic Cream, Night Table,
festival themes) as a **token/asset swap, not a rebuild**. Hard-coded hex/px/ms values
in components would make cross-platform consistency and theming impossible.

## Decision

**Design tokens are the single cross-platform contract.** Tokens are authored once in
`packages/design-tokens` and exported to **CSS custom properties + a Tailwind theme**
(web), **a token JSON object** (React Native), and map 1:1 to **Figma Variables** with
**modes** per theme. Components reference **only semantic tokens** (tier-2 roles), never
primitives or raw values. **No raw hex, px, or ms in components** — a lint rule fails
PRs that hard-code visual values. Theming = remapping semantic tokens; components,
layout, spacing, and motion never change between themes.

## Alternatives considered

- **Per-platform styling (Tailwind config on web, separate RN styles).** Rejected:
  guarantees drift; two sources of truth for one visual language.
- **Primitives referenced directly in components.** Rejected: breaks theming (no role
  layer to remap) and couples components to raw values.
- **Runtime theming via JS objects only (no Figma parity).** Rejected: loses the
  design↔code 1:1 that keeps the system maintainable.

## Consequences

- **+** One definition drives every platform + Figma; theming is a swap; adding a
  festival theme is an asset/token change.
- **+** Enforced consistency via lint; screens compose from tokens + components only.
- **−** Requires a token build/export step and a naming convention discipline.
- **Open reconciliation (UQ-2):** the docs' semantic-alias names differ from the Phase
  0 spec's (`bg.canvas` vs `background.canvas`, etc.); resolve during token authoring
  (primitive palette values already agree exactly).

## Verification method

A token validation test asserts every semantic token resolves to a defined primitive
and that web (CSS var) and RN (JSON) exports carry the same token set/values. A lint
rule flags a deliberately hard-coded hex/px in a component. Verified when the
design-tokens package tests + lint pass in Stage B.
