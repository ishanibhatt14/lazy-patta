# Growth Funnel

Lazy Patta's first multiplayer North Star event is
`family_multiplayer_game_completed`: a family room starts and completes a real
server-authoritative round.

## Event Contract

| Event                               | Trigger                             | Required properties                               | Forbidden properties                        | Stage       | Business question                             |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------- | ------------------------------------------- | ----------- | --------------------------------------------- |
| `mobile_home_viewed`                | `/mobile` renders                   | none                                              | display names, room codes, tokens           | Acquisition | Are visitors reaching the mobile app surface? |
| `game_selected`                     | User opens a game tile/setup        | `gameSlug`                                        | room codes, card hands                      | Activation  | Which games create intent?                    |
| `family_room_create_started`        | Create request starts               | `gameSlug`                                        | display names, room codes                   | Invitation  | How many users try to host?                   |
| `family_room_created`               | Server returns a room               | `gameSlug`, `playerCapacity`                      | full room code, host name, tokens           | Invitation  | Does create work reliably?                    |
| `invite_shared`                     | Native/WhatsApp/copy share succeeds | `method`, optional `gameSlug`                     | recipient data, full room code              | Invitation  | Which share paths are used?                   |
| `invite_opened`                     | `/join/{code}` opens                | optional `gameSlug`                               | full room code, referrer PII                | Acquisition | Do invitations bring relatives back?          |
| `room_join_started`                 | Join request starts                 | optional `gameSlug`                               | display names, room code                    | Activation  | Do invitees attempt to join?                  |
| `room_joined`                       | Join succeeds                       | `gameSlug`                                        | display names, tokens                       | Activation  | Does the join flow work?                      |
| `lobby_viewed`                      | Lobby renders with room data        | `gameSlug`, `playerCount`                         | player names, room code                     | Activation  | Do rooms reach a playable lobby?              |
| `minimum_players_reached`           | Lobby reaches game minimum          | `gameSlug`, `playerCount`                         | player names                                | Activation  | Are invites filling tables?                   |
| `game_start_clicked`                | Host taps Start                     | `gameSlug`, `playerCount`                         | user IDs, room code                         | Activation  | Are hosts trying to start?                    |
| `game_start_succeeded`              | Authority starts a game             | `gameSlug`, `playerCount`                         | game IDs, hands                             | Activation  | Does start complete?                          |
| `game_start_failed`                 | Start fails                         | `code`                                            | raw backend messages, IDs                   | Reliability | Where does start fail?                        |
| `multiplayer_game_started`          | Game board becomes active           | `gameSlug`, `playerCount`                         | hands, tokens                               | Activation  | How many lobbies become games?                |
| `family_multiplayer_game_completed` | Round completes                     | `gameSlug`, `playerCount`, `roundDurationSeconds` | hands, hidden scores                        | Retention   | Are families finishing rounds?                |
| `rematch_vote_submitted`            | Viewer votes                        | `gameSlug`                                        | display name, room code                     | Retention   | Do players want another round?                |
| `rematch_started`                   | Next round starts                   | `gameSlug`, `playerCount`                         | room code, game IDs                         | Retention   | Do completions loop into replays?             |
| `result_shared`                     | Result share succeeds               | `gameSlug`, `method`                              | room code, names beyond visible result text | Acquisition | Do completed games create new invites?        |

## Core Calculations

- Room creation success: `family_room_created / family_room_create_started`
- Invite-to-open rate: `invite_opened / invite_shared`
- Invite-to-join rate: `room_joined from invite / invite_opened`
- Game completion rate: `family_multiplayer_game_completed / multiplayer_game_started`
- Rematch rate: `rematch_started / family_multiplayer_game_completed`
- Result-share rate: `result_shared / family_multiplayer_game_completed`

## Implementation Notes

The typed wrapper lives in `apps/web/lib/growth/analytics.ts`. It dispatches an
in-browser `lazy-patta:growth-event` event and deliberately does not install a
new vendor. Analytics failures are swallowed and must never block gameplay.
