# ADR-0001 — Separate Lazy Patta repository

**Status:** Accepted (2026-07-12) · Locks decision D-50 / D-03.

## Context

Lazy Patta belongs to the "Lazy" family of products (alongside the existing Lazy
Traveler). We must decide whether it lives in a shared monorepo with the other Lazy
products or in its own repository. The products share brand equity and design
sensibility but not runtime code, release cadence, data models, or on-call.

## Decision

Lazy Patta lives in its **own repository** with its **own deployment pipeline**.
Cross-product sharing is limited to **brand equity** (naming, tone) — not code. Any
future shared code would be published as a versioned package, not a repo merge.

## Alternatives considered

- **One org-wide monorepo for all Lazy products.** Rejected: couples release
  cadence, CI time, and blast radius across unrelated products; forces shared
  dependency versions; complicates ownership and permissions.
- **Git submodules linking a shared core.** Rejected: submodule ergonomics are poor;
  no real shared runtime code exists yet to justify it (avoid speculative coupling).

## Consequences

- **+** Independent deploys, CI, versioning, and incident scope.
- **+** Simpler permissions and CODEOWNERS.
- **−** Any genuinely shared utility must be published as a package rather than
  imported directly — acceptable, and none exists today.
- Within _this_ repo we still use a monorepo for web + mobile + shared packages
  ([ADR-0002](./0002-monorepo-for-web-mobile-shared-packages.md)).

## Verification method

Repository exists standalone with its own CI workflow and deploy target; no build- or
run-time dependency on any other Lazy repo (verified by absence of cross-repo imports
and a self-contained install/build). Confirmed at Phase 0 when CI runs green against
this repo alone.
