# User Flows

The journeys that matter, end-to-end. Each references screens in the
[screen catalog](./screen-catalog.md) and components from the
[design system](../02-design-system/).

## 1. New player → computer game (the guest "aha")

The fastest path to value; **no account required**.

```
Splash → Language → Welcome
      → "Play computer as guest"
      → Home → Gadha Chor → Play Computer
      → (first run) How-to-play / coached game
      → Game Table → Result → Rematch
```

- **Goal:** a first-timer finishes a full match in minutes and wants another.
- **Critical:** zero friction; tutorial skippable; guest state saved locally.
- **Events:** `onboarding_started/completed`, `guest_game_started/completed`,
  `tutorial_completed`.

## 2. New player → private live room (the diaspora use case)

Usually begins from an **invite deep link** shared on WhatsApp.

```
Invite deep link → Sign in (Apple/Google/Email OTP)
      → OTP / social callback → Profile setup (first time only)
      → Room Lobby (guest) → Ready
      → Game Table → Result → Rematch
```

- **Goal:** a relative taps a link and is at the table with minimal fuss.
- **Critical:** deep link survives auth + cold install; profile setup is one-time
  and fast; login rationale is warm.
- **Events:** `sign_in_started/completed/failed`, `room_joined`,
  `game_started/completed`, `rematch_requested/accepted`.

## 3. Host a private room

```
Home → Create Private Room
      → configure (players 2–6 · allow bots · turn timer · rule pack)
      → Host Lobby (room code + invite/share, seats, ready, host controls)
      → Start Game → Game Table → Result → Rematch lobby
```

- **Critical:** one-tap **share** of the room code/link; host can add bots to fill
  seats; host controls start + settings.
- **Events:** `room_created`, `room_start_failed?`, `game_started`.

## 4. Returning disconnected player (reconnect)

A first-class flow, not an edge case — mobile data is flaky.

```
Open app / deep link → session restored
      → Reconnecting overlay
      → fetch latest public snapshot + own private hand (never replay local guesses)
      → resume at current turn
```

- **Critical:** **no card leakage**, no desync; 60s grace before removal; host may
  replace with a bot after grace.
- **Events:** `reconnect_started/succeeded/failed`.

## 5. Rematch

```
Result → Rematch → Rematch Lobby (same players/seats) → new Game
```

- **Critical:** keep the group together; the Gadha Chor loser is invited _first_ and
  warmly. Low-friction re-ready.

## 6. Account deletion (trust + store requirement)

```
Settings → Account → Delete account
      → optional reason → re-authenticate → confirm
      → deletion request queued → signed out → confirmation
```

- Also available on the public web page `/delete-account`.
- **Critical:** honest copy; revoke provider tokens; delete/anonymize per retention
  policy ([privacy-compliance](../05-architecture/security-and-privacy.md)).

## 7. Report / block

```
Player (in lobby/room/profile) → Report or Block
      → reason (report) / confirm (block)
      → confirmation; blocked user can't share a room with you
```

- Preset reasons; no free-text harassment vectors; feeds moderation
  ([security](../05-architecture/security-and-privacy.md)).

## Flow-level acceptance

- Guest can reach "playing vs computer" in ≤ 3 taps from Home.
- Every gated action shows a warm sign-in prompt, never a dead wall.
- Every flow has defined **loading / empty / error / offline** states (see catalog).
- Every flow works in EN / GU / HI and under reduced-motion + screen reader.
