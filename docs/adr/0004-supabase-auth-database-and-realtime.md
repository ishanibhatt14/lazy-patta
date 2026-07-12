# ADR-0004 — Supabase for Auth, Database & Realtime

**Status:** Accepted (2026-07-12) · Locks decision D-53 / D-32.

## Context

We need authentication (email OTP/magic link, Apple, Google), a relational database
with row-level authorization, realtime fan-out for game updates, file storage, and a
place to run server-authoritative logic — without standing up and operating a bespoke
backend for an MVP.

## Decision

Use **Supabase** as the backend platform: **Auth**, **Postgres** (schema via
migrations, source of truth), **Realtime** (private channel per game, membership-authorized), **Storage**, and **Edge Functions** (server-authoritative actions importing the shared engine). **RLS is enabled on every user-accessible table**; private hands are readable only by their owner. All state writes go through Edge Functions using the service role after validating the user JWT — **no client writes game state directly**.

## Alternatives considered

- **Firebase.** Rejected: document model is a poorer fit for relational game/room data
  and transactional row-locking; RLS-style SQL policies are a better anti-cheat fit.
- **Custom Node/Postgres backend.** Rejected for MVP: more infra to operate; Supabase
  gives auth + RLS + realtime + functions out of the box.
- **PlanetScale/Neon + separate auth + separate realtime.** Rejected: more moving
  parts to integrate and secure than one platform provides.

## Consequences

- **+** Auth, RLS, realtime, storage, and functions in one platform; fast to ship.
- **+** RLS provides defense-in-depth for hidden state alongside Edge-Function checks.
- **−** Platform coupling; mitigated because the **engine and contracts are
  platform-agnostic** and portable if we ever migrate.
- Secrets (service role, provider keys) live **only** in server env vars — never
  committed, never in client bundles, never in GitHub Actions as plaintext.

## Verification method

Phase 0 ships three migrations (`profiles`, `user_preferences`,
`account_deletion_requests`) with RLS policies and a **verification script/test**
asserting: RLS is enabled on each table, a user can read/write only their own rows,
and cross-user access is denied. Verified when that RLS test passes against a local
Supabase instance.
