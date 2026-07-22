# Family Room Flow

## Source Of Truth

Room capability starts in `apps/web/lib/product-capabilities.ts`, then combines
with `/api/rooms/health` at runtime. Components do not independently decide that
private rooms are available.

## Lifecycle

1. User selects a game on `/mobile`.
2. The setup sheet links to `/mobile/rooms?game={roomGameKey}` only when the
   capability registry says the room mode exists.
3. `/mobile/rooms` checks room-service health without blocking the whole page.
4. Create/join actions show loading immediately, warn at 8 seconds, and stop at
   12 seconds with recovery actions.
5. Room mutations go through Supabase RPCs or server-authority route handlers.
6. The lobby polls current RLS-scoped room state. Realtime remains a rollout
   gap, so health reports `degraded` rather than fully available.
7. Host-only start is enforced again on the server in
   `apps/web/app/api/rooms/[roomId]/start/route.ts`.

## Known Limitations

- Guest anonymous Supabase sign-in exists, but invitation join still depends on
  the auth panel completing before the lobby can seat the player.
- Realtime, reconnect grace, persisted rematch votes, and next-round creation are
  not backed by dedicated tables/RPCs yet.
- Current room reads are RLS-scoped to members; public pre-join room metadata
  needs a separate safe endpoint before invite previews can show live seat count.

## Rollback

Hide private-room CTAs by changing the capability registry private-room status
to `temporarily-unavailable`, or return unavailable from `/api/rooms/health`.
Server authorization remains unchanged.
