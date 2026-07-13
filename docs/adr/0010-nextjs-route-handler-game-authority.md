# ADR-0010 — Next.js Route Handler as the game-action authority runtime

**Status:** Accepted (2026-07-12) · Refines ADR-0003 (server-authoritative
multiplayer) and scopes ADR-0009 (Postgres RPC authority boundary).

## Context

ADR-0003 requires the **server** to be authoritative for every hidden-state
mutation, and sketched the runtime as a Supabase **Edge Function** that runs the
pure engine inside a locked transaction. ADR-0009 then moved the _room lifecycle_
authority (create/join/ready/bot/leave) into **`SECURITY DEFINER` Postgres RPCs**,
because those operations are pure SQL invariants (capacity, single host, seat
allocation) with no game rules.

Live **gameplay** is different: the Gadha Chor rules live in the TypeScript pure
engine (`packages/game-engine`) — the single, property-tested rule authority
(ADR-0006). PL/pgSQL cannot run that engine, so a gameplay RPC would have to
**re-implement the rulebook in SQL**, duplicating logic and diverging from the
tested source of truth — an unacceptable correctness/anti-cheat risk. So gameplay
authority needs a **TypeScript runtime**. Two hosts were viable: a Supabase Edge
Function (Deno) or a Next.js Route Handler (Node) inside `apps/web`.

## Decision

Game-**action** authority runs in **Next.js Route Handlers** (Node runtime) under
`apps/web/app/api/**`, which import the workspace `game-engine` directly. Each
handler:

- authenticates the caller from their access token (a request-scoped Supabase
  client → `auth.getUser()`), and authorizes them against room/seat membership
  and turn ownership;
- loads the full authoritative `GameState`, runs the **pure engine**
  (`init` / `reduce` / `botMove`) with a **crypto RNG**, and computes the new
  public snapshot + per-player hands + events;
- **persists atomically** by calling a thin `SECURITY DEFINER` persistence RPC
  (`start_game`, `commit_game_action`) with the _already-computed_ result. That
  RPC contains **no game rules**: it locks the `games` row, enforces the
  `expectedVersion` optimistic-concurrency guard and `(game_id, actor_id,
client_action_id)` idempotency, and writes `games` + `game_authority_state` +
  `game_private_hands` + `game_events` in one transaction.

The service-role key is used **only** server-side inside these handlers; it is
never shipped to the browser. Clients keep SELECT-only, RLS-scoped reads and never
mutate game rows directly (unchanged from ADR-0009).

The full authoritative state (all hands, including bots) lives in a new
server-only table `game_authority_state` with **no `authenticated` grant** — the
DB itself refuses to hand hidden cards to a client. `game_private_hands` remains
the per-player, read-your-own projection clients consume.

## Alternatives considered

- **Supabase Edge Function (Deno), per ADR-0003's original sketch.** Rejected for
  now: it needs a separate Deno bundle of the workspace engine and a second deploy
  target with its own secrets, for no authority benefit over a Node route that
  imports the engine directly and shares the repo's CI, types, and tests. The Edge
  Function option stays open if authority must scale independently of the web app.
- **Postgres RPC running the rules (extend ADR-0009 to gameplay).** Rejected:
  duplicates the TypeScript rulebook in PL/pgSQL — the one thing ADR-0006 forbids.
- **In-transaction `SELECT … FOR UPDATE` from the Node runtime.** PostgREST/
  supabase-js cannot hold a multi-statement transaction across `await`s, so the
  lock + multi-table write is delegated to the persistence RPC instead; the Node
  side stays stateless and the atomic boundary remains the DB transaction.

## Consequences

- **+** One rule authority (the TS engine) drives both computer and live play;
  no SQL rule duplication.
- **+** Authority shares the monorepo's types, tests, and CI; no second runtime to
  bundle or secure. Atomicity + version guard + idempotency still live in one DB
  transaction (the persistence RPC).
- **+** Hidden state is unreadable by clients at the grant level
  (`game_authority_state` has no `authenticated` grant), not merely by convention.
- **−** Gameplay authority is coupled to the web app's deploy/availability; mobile
  (Phase 4) calls the web-hosted `/api` endpoint rather than a standalone function.
  If that coupling becomes a problem, the Edge Function alternative is the escape
  hatch — the engine and persistence RPCs are already runtime-agnostic.
- **−** The Node runtime must never leak the service-role key or another player's
  hand; enforced by keeping service-role usage inside `app/api/**` and returning
  only the caller's own `PrivateView`.

## Verification method

Structural tests assert the persistence RPCs are `SECURITY DEFINER` with a pinned
`search_path`, are revoked from `public`, granted only to `service_role`, and that
`game_authority_state` has RLS enabled with **no** `authenticated` grant.
Behavioural tests (live local Supabase) prove: a full match runs to completion via
the route handlers with one `state_version` bump per accepted action; a duplicate
`clientActionId` is idempotent; a stale `expectedVersion` is rejected; a client
cannot read `game_authority_state` or another player's `game_private_hands` row.
Route-level tests prove a non-member and a non-current player are refused. Verified
when those suites pass.
