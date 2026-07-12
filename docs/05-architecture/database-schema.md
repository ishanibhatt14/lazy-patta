# Database Schema

Postgres via Supabase. Schema is defined by **migrations** in `supabase/migrations/`
(the source of truth). **RLS is enabled on every user-accessible table**; private
hands are readable only by their owner.

## Core tables

| Table                       | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `profiles`                  | user identity: display name, avatar, language               |
| `user_preferences`          | sound, theme, accessibility, notification opt-ins           |
| `rooms`                     | private rooms: code, host, settings, status                 |
| `room_members`              | membership + role (host/guest) + seat intent                |
| `games`                     | a match: status, rule pack, current player, `state_version` |
| `game_players`              | seats in a game + player status                             |
| `game_public_snapshots`     | the public, shareable view of a game state                  |
| `game_player_private_state` | **per-player private hand** (RLS: owner only)               |
| `game_events`               | append-only event log (audit + replay)                      |
| `game_actions`              | submitted actions (idempotency + accept/reject)             |
| `push_tokens`               | per-device push tokens (opt-in)                             |
| `blocks`                    | user block relationships                                    |
| `reports`                   | player reports (moderation)                                 |
| `account_deletion_requests` | deletion queue + status                                     |

## Key constraints

- **One active seat per user per game.**
- **Unique room code while a room is open.**
- **Unique `(game_id, actor_id, client_action_id)`** → idempotency.
- **Monotonic `state_version`** per game.
- **RLS enabled on every user-accessible table.**

## Example SQL (core game tables)

```sql
create table public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  status text not null,                       -- LOBBY, DEALING, IN_PROGRESS, ...
  rule_pack jsonb not null,
  current_player_id uuid,
  state_version bigint not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.game_player_private_state (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat smallint not null,
  hand jsonb not null default '[]'::jsonb,     -- PRIVATE: only the owner may read
  status text not null,                         -- ACTIVE, FINISHED, ...
  primary key (game_id, user_id)
);

create table public.game_actions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id),
  actor_id uuid not null references auth.users(id),
  client_action_id uuid not null,
  action_type text not null,
  state_version_before bigint not null,
  state_version_after bigint,
  accepted boolean,
  created_at timestamptz not null default now(),
  unique (game_id, actor_id, client_action_id)  -- idempotency
);
```

`game_public_snapshots`, `game_events`, `rooms`, `room_members`, `game_players`,
`profiles`, etc. follow the same patterns (FKs, `created_at`, status enums as text
with check constraints, JSONB for flexible game state).

## RLS requirements

- Users can **read/update their own** `profiles` / `user_preferences`.
- **Room members** can read the public room/lobby state.
- **Only the host** can change room settings or start a game.
- Players can read **only their own** `game_player_private_state` row.
- **No client can directly write** game state, hands, or the action log — writes go
  through **Edge Functions using the service role after validating the user JWT**.
- **Private Realtime channel authorization** checks room membership.

See [security-and-privacy](./security-and-privacy.md) for the full RLS + anti-cheat rationale.

## State model (stored)

- **Game states:** `LOBBY, DEALING, REMOVING_INITIAL_PAIRS, IN_PROGRESS,
PAUSED_RECONNECT, COMPLETED, ABANDONED`.
- **Player states:** `INVITED, JOINED, READY, ACTIVE, FINISHED, DISCONNECTED, LEFT`.
- **Events:** `ROOM_CREATED, PLAYER_JOINED, PLAYER_READY_CHANGED, GAME_STARTED,
CARDS_DEALT, PAIR_REMOVED, CARD_DRAWN, TURN_ADVANCED, PLAYER_FINISHED,
PLAYER_DISCONNECTED, PLAYER_RECONNECTED, GAME_COMPLETED, REMATCH_REQUESTED`.

## Data lifecycle

- `game_events` is append-only (audit/replay); prune per retention policy.
- Account deletion anonymizes/deletes `profiles`, `push_tokens`, `room_members`, and
  personal history per [security-and-privacy](./security-and-privacy.md).
- **Never store** OTP values, provider tokens, or (in logs) card hands.
