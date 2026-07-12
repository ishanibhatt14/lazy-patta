# Screen Catalog

Every screen, specified with a **shared template** so they stay consistent and
maintainable. Screens are compositions of [components](../02-design-system/components.md);
they hold no raw values. The game table has its own deep spec in
[game-table-contract](./game-table-contract.md).

## Per-screen template

Each screen documents:

- **Purpose** — the one job of this screen.
- **Key components** — from the design system.
- **Primary actions** — what the user can do.
- **States** — loading · empty · error · offline (where applicable).
- **Edge cases** — the tricky bits.
- **Motion / haptics** — from motion tokens.
- **A11y** — focus order, SR labels, live regions, reduced-motion, 200% text.

A per-screen spec is not "done" until all seven are filled. Below, common
cross-cutting states are defined once, then each screen notes only its specifics.

### Universal states (apply everywhere)

- **Loading:** `Skeleton` + mascot vignette for full-screen; inline spinners retain
  labels for a11y.
- **Empty:** Gaddo vignette + one warm line + a clear next action
  ([illustration](../01-brand/illustration-and-texture.md)).
- **Error:** honest, blame-free `Banner`/`Toast` + retry; never a dead end.
- **Offline / reconnect:** `OfflineOverlay`/`ReconnectOverlay` at `z.reconnect`.

---

## Onboarding & auth

### 1. Splash

- **Purpose:** brand moment while the app boots. **Components:** logo lockup, Gaddo
  wave. **Actions:** none (auto-advance). **A11y:** respects reduced-motion (static
  logo); announces "Lazy Patta".

### 2. Language selection

- **Purpose:** pick EN / ગુજરાતી / हिन्दी up front. **Components:** `LanguageChip` ×3,
  `Button` (continue). **Edge:** default from device locale; changeable later in
  Settings. **A11y:** each chip labeled in-script; large targets.

### 3. Welcome

- **Purpose:** set the tone + route to sign-in or guest. **Components:** hero art,
  tagline, `Button` primary (Get started), tertiary (Play as guest). **Copy:** "No
  cash. No betting. Just family fun."

### 4. Sign-in options

- **Purpose:** choose auth. **Components:** `Button` Apple (iOS), Google (Android/web),
  Email code; tertiary "Play computer as guest". **Edge:** show platform-appropriate
  providers ([auth](../05-architecture/)); guest path always visible. **A11y:** provider
  buttons labeled; keyboard order logical.

### 5. Email entry

- **Purpose:** capture email for OTP. **Components:** `EmailInput`, `Button`.
  **States:** error (invalid email), loading (sending). **A11y:** `inputMode=email`,
  autocomplete, error announced.

### 6. OTP verification

- **Purpose:** verify code. **Components:** `OTPInput` (6), resend `Button`, timer.
  **States:** partial, complete, error (wrong/expired), loading. **Edge:** iOS
  one-time-code autofill; resend cooldown. **A11y:** numeric keypad; error live region.

### 7. Profile setup (first login only)

- **Purpose:** display name, avatar, language, sound. **Components:** `Input`
  (name, **profanity-filtered**), `AvatarPicker`, `LanguageChip`, sound toggle,
  `Button`. **Edge:** name uniqueness not required but filtered; skip → sensible
  defaults. **A11y:** labeled controls; avatar options have names.

---

## Home & discovery

### 8. Home

- **Purpose:** the hub — resume, browse games, pick a mode. **Components:**
  `AppHeader`, **Continue playing** row, `GameTile` grid, `ModeCard` ×3.
  **States:** empty (no active games → highlight Gadha Chor). **A11y:** heading
  structure; each tile/card labeled with state (available/coming soon).

### 9. Game details — Gadha Chor

- **Purpose:** sell + explain the game, entry to modes. **Components:** hero art,
  description, **How to play** link, `ModeCard`s. **Actions:** Play Computer /
  Create Room / Join Room.

### 10. How to play

- **Purpose:** teach in ~5 illustrated steps. **Components:** step carousel, Gaddo
  "teach" poses, `Button`. **A11y:** each step has text (not image-only); swipe has
  button alternative; reduced-motion static.

### 11. Play-mode selection

- **Purpose:** choose Computer / Create / Join. **Components:** `ModeCard` ×3.
  **Edge:** Create/Join prompt sign-in for guests (warm rationale).

---

## Rooms & lobby

### 12. Create room

- **Purpose:** configure a private room. **Components:** player-count stepper (2–6),
  allow-bots toggle, turn-timer select, rule-pack select, `Button` (Create).
  **A11y:** every setting labeled; values announced.

### 13. Join room

- **Purpose:** enter a room code (or arrive via deep link). **Components:** code
  `Input`, `Button`. **States:** error (invalid/expired/full room), loading.
  **Edge:** deep link pre-fills code; blocked users can't join a shared room.

### 14. Host lobby

- **Purpose:** gather players, start. **Components:** `RoomCode` (copy/share),
  `PlayerSeat`s, ready indicators, add-bot, host controls, `Button` (Start).
  **States:** waiting/empty seats. **Edge:** start disabled until min players/ready;
  only host can change settings/start ([RLS](../05-architecture/security-and-privacy.md)).

### 15. Guest lobby

- **Purpose:** join, ready up, wait for host. **Components:** `PlayerSeat`s, `Toggle`
  (ready), `RoomCode` (share). **Edge:** host-left handling; reconnect.

---

## Game table (see full contract doc)

### 16. Game — my turn

- **Purpose:** take an action. **Components:** table layout, `HandFan`, `PlayerSeat`s,
  `TurnBanner` ("Tamaro varo!"), `TurnTimer?`, `ReactionPicker`, top controls.
  **A11y:** turn announced (live region); draw targets labeled by position/count.

### 17. Game — opponent turn

- **Purpose:** clear waiting state. **Components:** same, `TurnBanner`
  ("Waiting for {name}…"), opponent seat pulse. **Motion:** calm ambient; bot delay.

### 18. Draw-card interaction

- **Purpose:** pick which card to draw. **Components:** eligible opponent backs
  **lift + teal glow**; tap to draw (no drag). **Edge:** face revealed **only to
  drawer, after server confirm**; positionToken opaque. **A11y:** "Draw from {name},
  {n} cards" per target.

### 19. Pair-found state

- **Purpose:** celebrate a `jodi`. **Motion:** cards → center → flip → Bandhani
  dissolve; chime + success haptic. **A11y:** "Jodi mali gai!" announced; reduced-
  motion fade.

### 20. Player disconnected

- **Purpose:** show a paused seat. **Components:** `PlayerSeat` disconnected state,
  status text. **Edge:** 60s grace; host may bot-replace after.

### 21. Reconnecting

- **Purpose:** rejoin safely. **Components:** `ReconnectOverlay` + Gaddo nap.
  **Edge:** fetch snapshot + own hand; never replay local state.

---

## Results & social

### 22. Result — winner

- **Purpose:** celebrate. **Components:** `ResultCard` winner variant, confetti,
  `Button` (Rematch / Exit). **Motion:** warm flourish (`reveal`).

### 23. Result — Gadha Chor

- **Purpose:** gentle, funny loser reveal. **Components:** `ResultCard` gadhaChor
  variant + mascot. **Copy:** affectionate; Rematch offered first. **A11y:** result
  announced in text; reduced-motion still mascot.

### 24. Rematch lobby

- **Purpose:** keep the group together. **Components:** seats, ready, `Button`.

### 25. Profile & stats

- **Purpose:** identity + private/family stats. **Components:** `ProfileCard`,
  `StatTile`s, `AchievementCard`s, match history list. **States:** empty (first-timer
  vignette). **A11y:** stats have text labels, not icon-only.

---

## Settings, help, legal

### 26. Language & sound settings

- **Components:** `LanguageChip`s, sound/music/voice `Toggle`s + volume, haptics
  toggle. **A11y:** immediate, announced changes.

### 27. Notifications settings

- **Purpose:** opt-in only (invite / room ready / rematch). **Components:**
  `SettingsRow` + `Toggle`s. **Edge:** no marketing pushes in MVP.

### 28. Theme & accessibility settings

- **Components:** theme select (System/Cream/Night/festival), senior-mode, reduced-
  motion, colorblind, large-text toggles. **A11y:** the meta-screen for a11y itself —
  exemplary.

### 29. Help & rules

- **Components:** how-to-play entry, FAQ, contact/support link.

### 30. Report / block player

- **Components:** preset reason list, confirm `ConfirmationSheet`. **Edge:** feeds
  moderation; blocked users separated in matchmaking/rooms.

### 31. Privacy / account deletion

- **Components:** links (privacy/terms/support), Delete-account flow entry,
  `ConfirmationSheet` + re-auth. **Edge:** mirrors public `/delete-account` web page.

### 32. Generic states (empty / loading / offline / error)

- **Purpose:** reusable, on-brand fallbacks used across all screens (defined in
  "Universal states" above). Each is a real, warm screen — never a blank.

---

## Coverage checklist

- [ ] Every screen: all 7 template fields filled.
- [ ] Every screen: loading/empty/error/offline defined (or N/A justified).
- [ ] Every screen: EN/GU/HI at 100%/200% verified.
- [ ] Every screen: keyboard + screen-reader + reduced-motion pass.
- [ ] Every screen: composed only from design-system components.
