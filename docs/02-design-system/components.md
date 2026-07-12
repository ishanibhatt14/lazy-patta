# Component Inventory

Every reusable building block, its states/variants, and its props contract.
Components consume **semantic tokens only** and are built with shadcn/ui + Tailwind
(+ Framer Motion for animation). The same component API is mirrored in Expo/RN via
shared token JSON. Screens (section 03) compose these — they never introduce raw
values or one-off UI.

**Conventions**

- Every interactive component: min target `size.touch.min` (48), visible focus,
  screen-reader label, disabled + loading states where actions can be async.
- States use tokens (`.hover`, `.pressed`, `.disabled`) from
  [color](./color.md)/[design-tokens](./design-tokens.md).
- Motion uses [motion tokens](./motion-and-animation.md) and respects reduced-motion.
- Props below are the **contract**; implementation lives in `packages/shared-ui`.

---

## Foundational components

### Button

- **Variants:** `primary` (maroon), `secondary` (teal), `tertiary` (ghost/text),
  `destructive` (error).
- **States:** default, hover, pressed, disabled, **loading** (spinner, label
  retained for a11y), focus-visible.
- **Sizes:** `md` (48h default), `lg` (senior/hero).
- **Props:** `variant`, `size`, `leadingIcon?`, `trailingIcon?`, `loading?`,
  `disabled?`, `fullWidth?`, `onPress`, `aria-label?` (icon-only requires label).

### IconButton

- **States:** default, pressed, disabled, focus-visible.
- **Rule:** always 48×48 hit area even if the glyph is smaller; **`aria-label` required**.

### Input / EmailInput

- **States:** default, focus, error (with message), disabled, filled.
- **Props:** `type`, `value`, `onChange`, `label`, `error?`, `hint?`, `disabled?`,
  `inputMode?` (email/numeric), `autoComplete?`.

### OTPInput

- Six-digit code entry. **States:** empty, partial, complete, error.
- **Props:** `length=6`, `value`, `onChange`, `onComplete`, `error?`,
  `autoFocus`, `oneTimeCode` (iOS autofill). Numeric keyboard; paste-fill supported.

### LanguageChip

- Selectable chips: **English · ગુજરાતી · हिन्दी**. Variants: selected/unselected.
- **Props:** `locale`, `selected`, `onSelect`. Renders its own label in-script.

### Avatar / AvatarPicker

- **Variants:** sizes (sm/md/lg), online-state ring (online/offline), fallback initials.
- **AvatarPicker:** grid of preset avatars (no photo upload in MVP → privacy-safe).
- **Props:** `src|presetId`, `size`, `online?`, `name` (for initials + a11y label).

### Toast / Banner

- Transient (`Toast`) and persistent (`Banner`) messaging. Variants: info, success,
  warning, error. Auto-dismiss + manual close; announced via ARIA live region.

### Dialog / BottomSheet / ConfirmationSheet

- **Dialog:** centered modal (desktop-leaning). **BottomSheet:** mobile-first slide-up.
- **ConfirmationSheet:** destructive/confirm actions (e.g. delete account, leave room).
- Focus-trapped, ESC/scrim-dismiss (except critical confirmations), `elevation.3/4`,
  radius `xl`. **Props:** `open`, `onClose`, `title`, `children`, `actions[]`, `dismissible?`.

### SettingsRow / Toggle

- List row with label, optional description, and control (toggle/chevron/value).
- **Toggle** states: on, off, disabled, focus. Never color-only — include on/off text/icon.

### Skeleton / LoadingState

- Token-driven shimmer for lists, cards, table. Reduced-motion → static block.
- Pair with mascot loading vignette for full-screen loads (see [illustration](../01-brand/illustration-and-texture.md)).

---

## Navigation & structure

### AppHeader / TopBar

- Contextual top bar: title, back/close, and up to three actions (sound, reactions,
  menu on the table). 48px targets; safe-area aware on mobile.

### TabBar / NavRail

- Mobile bottom tabs (Home, Games, Profile) / desktop side rail. Active state uses
  text+icon+indicator, not color alone.

---

## Game-collection components

### GameTile

- Represents a game on Home/Collection. **States:** `available`, `locked`,
  `comingSoon`. Shows art, name, short descriptor.
- **Props:** `gameId`, `state`, `title`, `art`, `onPress?` (disabled when not available).

### ModeCard

- Choose how to play: **Play Computer · Create Private Room · Join Room**.
- **Props:** `mode`, `title`, `description`, `icon`, `requiresAuth?`, `onPress`.

### RoomCode chip

- Displays/join code with **copy** and **share** actions; states: default, copied, shared.
- **Props:** `code`, `onCopy`, `onShare`. Confirmation via Toast.

---

## The card & table components (the heart of the product)

### PlayingCard

The hero object. **States:** `face`, `back`, `playable`, `selected`, `disabled`, `matched`.

- **Playable:** slight lift (`elevation.2`) + soft teal glow (`action.secondary`);
  also indicated by icon/position for non-color a11y.
- **Matched:** flip + dissolve into Bandhani-dot particles ([motion](./motion-and-animation.md)).
- **Rank/suit are semantic keys** (localizable), large indices for legibility.
- **A11y:** each card has a screen-reader label (e.g. "Jack of spades, playable") for
  face cards; **opponent backs are never labeled with identity** (anti-cheat — the
  client never receives opponent card identities; see [architecture](../05-architecture/)).
- **Props:** `card?` (only for own/face-up), `state`, `positionToken?` (for draw
  targets — opaque, server-issued), `onSelect?`, `reducedMotion?`.

### HandFan

- Fans a player's own cards at the bottom; variants by card count; overlaps
  gracefully as counts grow; tap (never drag) to interact.
- **Props:** `cards`, `interactive?`, `onCardSelect?`, `maxSpread?`.

### PlayerSeat

- A player around the table. **Variants:** self / opponent; connected / disconnected;
  current-turn / waiting / finished.
- Shows avatar, name, card count, turn indicator (ring/banner), connection status.
- **Props:** `player`, `role` (self|opponent), `connection`, `turnState`, `cardCount`.

### TurnTimer (ring)

- Circular countdown. **States:** active, warning (low), expired. Only shown when the
  rule pack enables `turnSeconds`. Conveys time via ring + numerals + color (not color alone).
- **Props:** `secondsTotal`, `secondsLeft`, `state`.

### TurnBanner

- Prominent "Tamaro varo! / Your turn — pick one card" (or "Waiting for {name}…").
  Text-first so it doubles as the a11y turn announcement (ARIA live).

### ReactionPicker

- **Preset safe reactions only** (no free text/voice — [decisions D-24](../00-product-bible/decisions-log.md)).
  Small set of family-friendly emotes; sends a lightweight reaction event.
- **Props:** `reactions[]`, `onReact`, `cooldownMs` (rate-limited).

### OfflineOverlay / ReconnectOverlay

- Full-screen, top z-layer (`z.reconnect`). Shows calm mascot + "Rejoining your
  table…"; blocks input while reconnecting; auto-dismisses on state resync.
- **Props:** `status` (offline|reconnecting), `onRetry?`.

### ResultCard

- End-of-round. **Variants:** `winner` (celebration) and `gadhaChor` (gentle, funny
  loser reveal with mascot). Always offers **Rematch**.
- **Props:** `outcome`, `players[]`, `onRematch`, `onExit`.

---

## Profile / stats / social

### ProfileCard · LeaderboardCard · AchievementCard

- **ProfileCard:** avatar, name, language, headline stats.
- **LeaderboardCard:** _private/family scope only_ in MVP (no public leaderboards —
  [decisions](../00-product-bible/decisions-log.md)); rank row with avatar + stat.
- **AchievementCard:** folk-medallion badge, title, description, earned/locked
  (badges never represent currency — see [illustration](../01-brand/illustration-and-texture.md)).

### StatTile

- Single stat (games played, pairs found, family nights…). Label + value, token-driven.

---

## Component acceptance checklist (per component)

- [ ] Uses only semantic tokens (no raw hex/px/ms).
- [ ] All states/variants implemented and documented.
- [ ] 48×48 min target; visible focus; screen-reader label.
- [ ] Not color-only for any meaning.
- [ ] Reduced-motion + mute honored where relevant.
- [ ] Renders correctly in EN / GU / HI at 100% and 200%.
- [ ] Works in Classic Cream, Night Table, and one festival theme (token swap only).
- [ ] Mirrored/available in both web (shadcn) and Expo/RN.
