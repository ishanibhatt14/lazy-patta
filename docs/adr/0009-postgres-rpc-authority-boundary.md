# ADR-0009 — Postgres RPC as the authority boundary

**Status:** Accepted (2026-07-12) · Refines ADR-0003 (server-authoritative multiplayer).

## Context

ADR-0003 established that the **server is authoritative** for all hidden-state
mutations, and sketched the mechanism as a Supabase **Edge Function** that opens a
transaction, locks the game row, runs the pure engine, and bumps `state_version`.
Building Phase 3 revealed that the atomic core of that flow — verify membership,
lock, mutate, append event, bump version — is naturally a **single database
transaction**. Wrapping it in an Edge Function adds a network hop, a second
deploy target, and a place where a transaction can be left open across an await.

## Decision

The authority boundary is a set of **`SECURITY DEFINER` Postgres functions**
(RPCs) invoked through PostgREST (`supabase.rpc(...)`), not Edge Functions. Each
RPC:

- reads the caller's identity via `auth.uid()` — PostgREST sets the JWT claims
  GUC per request, so `auth.uid()` is the real caller **even inside** a definer
  function;
- runs its entire body in **one implicit transaction** (atomic authority
  boundary — no partial writes);
- validates membership / host-role / capacity, takes row locks (`for update`)
  where it serialises concurrent callers, and performs every write;
- is owned by a privileged role but **granted execute only to `authenticated`**
  (and `service_role`); it is `revoke`d from `public`.

Clients hold **SELECT-only** grants, scoped by RLS; they never `INSERT`/`UPDATE`/
`DELETE` directly. All state change goes through an RPC. The room lifecycle
functions in migration `0005` (`create_room`, `join_room_by_code`,
`set_seat_ready`, `add_bot_seat`, `remove_seat`, `leave_room`) are the first
instances; the game-action RPC (shuffle/deal/turn/version-bump) follows the same
shape.

## Alternatives considered

- **Supabase Edge Function per action (ADR-0003's original sketch).** Rejected
  for the MVP authority core: extra hop + deploy surface, and the transaction
  would span the function runtime. Edge Functions remain appropriate for work
  that is genuinely off-transaction (e.g. sending an email, calling a third
  party), not for the atomic mutate-and-bump.
- **Client writes guarded only by RLS.** Rejected: RLS can gate *rows* but cannot
  express multi-row invariants (capacity, single host seat, monotonic version)
  atomically; those belong in a transactional function.
- **A dedicated stateful game server.** Rejected for MVP for the same reasons as
  ADR-0003.

## Consequences

- **+** The atomic boundary is the DB transaction itself — impossible to leave
  half-applied; no second runtime to deploy or secure.
- **+** `auth.uid()` gives trustworthy caller identity without threading tokens
  through app code; the anon/authenticated keys never grant more than RLS allows.
- **+** Idempotency and optimistic concurrency (`client_action_id`,
  `expectedVersion`) live in SQL next to the data they guard.
- **−** Authority logic is authored in PL/pgSQL rather than TypeScript; the pure
  engine still owns rules, but the transactional wrapper is SQL and must be
  covered by behavioural tests.
- **−** Heavier CPU-bound work cannot live in an RPC; such cases would still reach
  for a function/worker.

## Verification method

Structural tests assert every RPC is `SECURITY DEFINER` with `set search_path =
public`, references `auth.uid()`, is revoked from `public`, and granted to
`authenticated`. Behavioural tests (live local Supabase, `SUPABASE_RLS_LIVE=1`)
prove: a guest cannot mutate; a non-host cannot add bots; join is idempotent and
capacity-bounded; a player reads only their own private hand. Verified when
`supabase/src/rooms-rls.test.ts` and `rooms-behavioral.test.ts` pass.
