# ADR-0005 — Guest play & authenticated private rooms

**Status:** Accepted (2026-07-12) · Locks decision D-54 / D-12 / D-21.

## Context

We want the lowest-friction path to the "aha" (a first completed game) while gating
identity/social features appropriately, and while staying store-compliant and safe for
a family + kids audience.

## Decision

Two access tiers:

- **Guest, no login — offline modes:** (a) **vs computer** (bots) and (b)
  **pass-and-play** on a single device. Both run the **same client-side engine**
  deterministically, with no network and no persistence.
- **Authenticated — live private rooms:** creating/joining live multiplayer rooms,
  and any profile/stats/identity feature, **require login** (email OTP/magic link
  everywhere; Apple on iOS, Google on Android/web; no passwords).

The guest path is always visible; sign-in is prompted only when the user reaches for a
feature that needs it (live rooms, identity), with a warm rationale.

## Alternatives considered

- **Login required up front.** Rejected: kills activation; nothing to try before
  committing identity.
- **Full anonymous multiplayer.** Rejected: live rooms need stable identity for
  membership, moderation (report/block), reconnection, and anti-cheat.
- **Guest vs-computer only (no pass-and-play).** Rejected: pass-and-play is a natural,
  zero-friction family mode on one device and reuses the same engine at no engine cost.

## Consequences

- **+** Instant, offline first play; conversion happens on intent, not by force.
- **+** Identity-gated features stay protected.
- **−** Pass-and-play is locked but **not yet threaded** through IA/screens/analytics
  (UQ-1 / risk R-1) — must be designed before that mode is built (post-Phase 0).
- Guest play stores nothing; only authenticated play persists to the DB.

## Verification method

Web e2e: a guest completes a full vs-computer match with no auth and no network calls
to the backend. Auth gating test: attempting to create/join a live room as a guest
routes to sign-in. Pass-and-play threading is tracked as an open item, not claimed
complete. Verified when the guest e2e passes in Stage B.
