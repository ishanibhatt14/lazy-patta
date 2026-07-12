# Traceability Matrix

Maps each core product capability across the full stack:
**Requirement → User flow → Screen → Component(s) → Engine capability → API / Edge
Function → Database entity → Analytics event → Test coverage.**

Purpose: prove every capability is designed end-to-end (or expose where it is not).
Cells marked **⚠️ GAP** are not yet designed and are tracked in
[unresolved-questions](./unresolved-questions.md).

Legend: _Screen_ numbers refer to
[screen-catalog](../03-ux-specification/screen-catalog.md). _Engine_ refers to
`packages/game-engine` capabilities in
[game-engine](../05-architecture/game-engine.md). _Edge Fn_ = a
`supabase/functions` server-authoritative action. _DB_ tables per
[database-schema](../05-architecture/database-schema.md). _Events_ per
[analytics-and-kpis](../07-product-strategy/analytics-and-kpis.md).

---

## Matrix (18 capabilities)

### 1. Guest computer play

- **Flow:** Welcome → Play as guest → Play Computer → game loop.
- **Screens:** 3 Welcome, 8 Home, 9 Game details, 11 Play-mode, 16–19 game table.
- **Components:** `ModeCard`, `HandFan`, `PlayerSeat`, `TurnBanner`.
- **Engine:** full loop client-side (`init/legalMoves/reduce/botMove/isComplete/result`), injected seeded RNG.
- **API/Edge Fn:** none (client-only, no network).
- **DB:** none (guest, no persistence).
- **Event:** `guest_game_started`, `guest_game_completed`.
- **Test:** engine unit + determinism fixtures; web e2e "guest completes a match."

### 2. Pass-and-play (single device) — ⚠️ PARTIAL

- **Flow:** ⚠️ GAP (no flow authored).
- **Screens:** ⚠️ GAP (no catalog screen; reuse 16–19 with per-turn handoff).
- **Components:** ⚠️ handoff/"pass device" screen not in inventory.
- **Engine:** **supported** — same local deterministic loop, multiple human seats, no bots required.
- **API/Edge Fn:** none (client-only).
- **DB:** none.
- **Event:** ⚠️ GAP (`passplay_game_started/completed` not defined).
- **Test:** ⚠️ GAP.
- **Status:** mode **locked (D-12b)** but unthreaded — tracked UQ-1 / risk R-1.

### 3. Sign-in (authenticated)

- **Flow:** Welcome → Get started → Sign-in options → provider or email OTP.
- **Screens:** 4 Sign-in options, 5 Email entry, 6 OTP verification.
- **Components:** `Button` (Apple/Google/Email), `EmailInput`, `OTPInput`.
- **Engine:** n/a.
- **API/Edge Fn:** Supabase Auth (OTP/magic link; Apple iOS, Google Android/web).
- **DB:** `auth.users` (Supabase-managed); `profiles` created on first login.
- **Event:** `sign_in_started`, `sign_in_completed`, `sign_in_failed`.
- **Test:** auth-abstraction interface unit tests; e2e email-OTP happy path.
- **Privacy:** never log OTP or provider tokens.

### 4. Profile setup (first login)

- **Flow:** first successful sign-in → Profile setup → Home.
- **Screens:** 7 Profile setup.
- **Components:** `Input` (name, profanity-filtered), `AvatarPicker`, `LanguageChip`, sound `Toggle`.
- **Engine:** n/a.
- **API/Edge Fn:** upsert profile (RLS: self only).
- **DB:** `profiles`, `user_preferences`.
- **Event:** `onboarding_completed`.
- **Test:** RLS test (user can only write own profile); profanity-filter unit.

### 5. Create private room

- **Flow:** Game details → Create Room (sign-in gate for guests) → Host lobby.
- **Screens:** 12 Create room, 14 Host lobby.
- **Components:** player-count stepper, allow-bots `Toggle`, turn-timer select, rule-pack select, `RoomCode`.
- **Engine:** rule-pack selection validated against contracts.
- **API/Edge Fn:** `create-room` (host-only, generates unique open code).
- **DB:** `rooms`, `room_members` (host).
- **Event:** `room_created`.
- **Test:** unique-open-code constraint test; RLS host-only settings.

### 6. Join through invite link

- **Flow:** deep link / code → Join room → Guest lobby.
- **Screens:** 13 Join room, 15 Guest lobby.
- **Components:** code `Input`, `Button`; deep-link pre-fill.
- **Engine:** n/a.
- **API/Edge Fn:** `join-room` (membership check; reject invalid/expired/full; block-aware).
- **DB:** `rooms`, `room_members`, `blocks` (enforcement).
- **Event:** `room_joined`, `room_start_failed` (on invalid/full).
- **Test:** join rejection cases; blocked-user cannot join.

### 7. Ready lobby

- **Flow:** in lobby → toggle ready → host sees all-ready.
- **Screens:** 14 Host lobby, 15 Guest lobby.
- **Components:** `PlayerSeat` ready indicators, `Toggle` (ready).
- **Engine:** n/a (lobby state).
- **API/Edge Fn:** `set-ready`; broadcast lobby version change.
- **DB:** `room_members` (seat intent), player status `READY`.
- **Event:** (lobby covered by `room_*`).
- **Test:** ready-state RLS; start disabled until min players ready.

### 8. Start game

- **Flow:** host lobby all-ready → Start → deal.
- **Screens:** 14 Host lobby → 16 game table.
- **Components:** host controls, `Button` (Start).
- **Engine:** `init(rulePack, players, rng)` → deal, `REMOVING_INITIAL_PAIRS`.
- **API/Edge Fn:** `start-game` (host-only; server crypto RNG shuffle; writes snapshot + private states).
- **DB:** `games`, `game_players`, `game_public_snapshots`, `game_player_private_state`, `game_events` (`GAME_STARTED`, `CARDS_DEALT`).
- **Event:** `game_started`.
- **Test:** deal invariant (card conservation, one Jack removed); host-only start.

### 9. Draw card

- **Flow:** my turn → tap eligible opponent back → server confirms → reveal to drawer.
- **Screens:** 16 my turn, 18 draw-card interaction.
- **Components:** opponent backs lift+teal glow, `HandFan`, `TurnBanner`.
- **Engine:** `legalMoves` → `DRAW_CARD`; `reduce` applies; projection hides others' hands.
- **API/Edge Fn:** `draw-card` (JWT, gameId, expectedVersion, clientActionId, **opaque positionToken**; row-lock; idempotent).
- **DB:** `game_actions` (unique idempotency), `game_public_snapshots`, `game_player_private_state`, `game_events` (`CARD_DRAWN`), `games.state_version` bump.
- **Event:** (folds into `game_*` / operational latency).
- **Test:** idempotency (dup client_action_id), stale `expectedVersion` reject, positionToken opacity (no hidden info leaked), one version bump per accepted action.

### 10. Automatic pair removal

- **Flow:** after deal and after each draw, same-rank pairs auto-discard.
- **Screens:** 19 pair-found state.
- **Components:** pair-to-center flip + Bandhani dissolve animation.
- **Engine:** pair detection in `reduce`; `PAIR_REMOVED` events.
- **API/Edge Fn:** part of `start-game` and `draw-card` transactions (server computes).
- **DB:** `game_events` (`PAIR_REMOVED`), updated private state.
- **Event:** (internal; surfaced via snapshot).
- **Test:** property — after removal no two same-rank cards co-held; exactly one unmatched removed-rank card persists to end.

### 11. Player finish

- **Flow:** a player's hand empties → marked finished → turn skips them.
- **Screens:** 16/17 (seat shows finished).
- **Components:** `PlayerSeat` finished state.
- **Engine:** end-of-hand detection per player; turn manager skips `FINISHED`.
- **API/Edge Fn:** within `draw-card` transaction.
- **DB:** `game_players`/`game_player_private_state` status `FINISHED`, `game_events` (`PLAYER_FINISHED`).
- **Event:** (folds into `game_*`).
- **Test:** turn-skip unit; finished player receives no legal moves.

### 12. Final Gadha Chor result

- **Flow:** one player left holding the odd Jack → game completes → result.
- **Screens:** 22 Result winner, 23 Result Gadha Chor.
- **Components:** `ResultCard` (winner / gadhaChor variants), mascot, confetti.
- **Engine:** `isComplete` + `result(state)` → winner/loser (last odd-Jack holder loses).
- **API/Edge Fn:** `draw-card` final transaction sets `COMPLETED`.
- **DB:** `games.status=COMPLETED`, `completed_at`, `game_events` (`GAME_COMPLETED`).
- **Event:** `game_completed`.
- **Test:** result correctness across seat counts; determinism golden fixtures.

### 13. Reconnect

- **Flow:** drop → `PAUSED_RECONNECT` → client refetches snapshot + own hand.
- **Screens:** 20 Player disconnected, 21 Reconnecting.
- **Components:** `ReconnectOverlay`, `PlayerSeat` disconnected state.
- **Engine:** projection re-derives private view; **never** replays local state.
- **API/Edge Fn:** fetch public snapshot + own private state (RLS); Realtime re-auth by membership.
- **DB:** `game_public_snapshots`, `game_player_private_state`, `game_events` (`PLAYER_DISCONNECTED/RECONNECTED`).
- **Event:** `reconnect_started/succeeded/failed`.
- **Test:** reconnect success rate metric; snapshot re-fetch e2e; no hidden-state leak on rejoin.

### 14. Bot replacement

- **Flow:** 60s grace after disconnect → host may replace with bot.
- **Screens:** 20 Player disconnected (host action).
- **Components:** host control (replace-with-bot).
- **Engine:** `botMove` takes over the seat; humanized 500–1200ms pacing.
- **API/Edge Fn:** `replace-with-bot` (host-only, after grace window).
- **DB:** `game_players` seat flagged bot-controlled, `game_events`.
- **Event:** (folds into `game_*`).
- **Test:** bot only makes legal moves; replacement gated by grace timer + host role.

### 15. Rematch

- **Flow:** result → Rematch → rematch lobby → new game, same group.
- **Screens:** 22/23 (Rematch button), 24 Rematch lobby.
- **Components:** `Button` (Rematch), seats, ready.
- **Engine:** fresh `init` with same players/rule pack.
- **API/Edge Fn:** `request-rematch` / `start-game` reused.
- **DB:** new `games` row, `game_events` (`REMATCH_REQUESTED`).
- **Event:** `rematch_requested`, `rematch_accepted`.
- **Test:** rematch preserves roster; new game independent state.

### 16. Report player

- **Flow:** in-game/profile → Report → reason → confirm.
- **Screens:** 30 Report / block player.
- **Components:** preset reason list, `ConfirmationSheet`.
- **Engine:** n/a.
- **API/Edge Fn:** `report-player` (writes report; no free text beyond presets).
- **DB:** `reports`.
- **Event:** (moderation, non-PII).
- **Test:** RLS (reporter identity), preset-only reasons.

### 17. Block player

- **Flow:** Report/block → Block → enforced in matchmaking/rooms.
- **Screens:** 30 Report / block player.
- **Components:** confirm `ConfirmationSheet`.
- **Engine:** n/a.
- **API/Edge Fn:** `block-user`; `join-room` consults blocks.
- **DB:** `blocks`.
- **Event:** (non-PII).
- **Test:** blocked users separated in room join (ties to capability 6).

### 18. Account deletion

- **Flow:** Settings → Privacy/account deletion → re-auth → confirm; mirrored public `/delete-account`.
- **Screens:** 31 Privacy / account deletion.
- **Components:** `ConfirmationSheet` + re-auth, links.
- **Engine:** n/a.
- **API/Edge Fn:** `request-account-deletion` (queues); web `/delete-account` page.
- **DB:** `account_deletion_requests`; anonymizes/deletes `profiles`, `push_tokens`, `room_members`, personal history.
- **Event:** analytics identifiers removed/anonymized with the account.
- **Test:** deletion request row created; RLS self-only; anonymization path (Stage B migration verification).

---

## Coverage summary

| Status                  | Capabilities                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Fully traced end-to-end | 1, 3–18 (17 of 18)                                                                    |
| Partial / gap           | **2 Pass-and-play** — engine-supported but no flow/screen/component/event (UQ-1, R-1) |

All 18 capabilities have an owning DB entity or an explicit "no persistence"
rationale (guest/pass-and-play are client-only). The only structural gap is
pass-and-play UX threading.
