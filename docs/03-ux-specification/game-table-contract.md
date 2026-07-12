# Game Table UI Contract

The game table is the product's heart and its trickiest surface — it must be
delightful, legible for all ages, **and** leak zero private information. This
contract binds the UI to the [multiplayer authority model](../05-architecture/multiplayer-authority.md).

## Layout (portrait mobile, the primary target)

```
┌────────────────────────────────────────┐
│  Top: room status · sound · reactions · │  ← AppHeader controls (48px targets)
│       menu                              │
├────────────────────────────────────────┤
│        Upper arc: opponent seats        │  ← PlayerSeat (avatar, name, card count,
│        (card counts, turn/finished)     │     turn/finished/disconnected states)
│                                         │
│            Center: current action,      │  ← TurnBanner, pair animation,
│            matched-pair animation,      │     deck/table decoration (folk motif)
│            deck / table decoration      │
│                                         │
├────────────────────────────────────────┤
│  Bottom: your identity · your hand ·    │  ← PlayerSeat (self) + HandFan +
│  turn timer · instruction               │     TurnTimer? + TurnBanner instruction
└────────────────────────────────────────┘
```

- **Own cards** are face-up in the bottom `HandFan`. **Opponent cards** are backs.
- **Desktop:** center the table in a **16:10** play area; optional right panel for
  room info + reactions. **Mobile:** use bottom sheets instead of a permanent panel.
- Cards are **large** enough to read at arm's length (senior-friendly).

## The draw interaction (tap, never drag)

1. On your turn, eligible opponent card **backs lift slightly and show a soft teal
   glow** (`action.secondary`) — plus a non-color cue (icon + position) for a11y.
2. You **tap one card** — no drag, no confirm dialog.
3. Client sends **`DRAW_CARD` with an opaque `positionToken`** (server-issued,
   expires on version change) — **never a card identity**.
4. Server validates turn + membership + token, applies the move, and returns a new
   **state version**.
5. **Only after** the authoritative response does the drawn card's **face animate**
   — and only to _you_, the drawer.
6. If it forms a pair, the pair animation runs (fly to center → flip → Bandhani
   dissolve) + "Jodi mali gai!".

## Privacy & anti-cheat rules (non-negotiable)

- **Clients never receive opponent card identities.** The UI only knows counts,
  positions, and its own hand. Opponent backs carry **no** hidden data payload.
- **Position tokens are opaque and short-lived** — they map to a card server-side
  and expire when `state_version` changes, so a stale token can't be replayed.
- A card face becomes visible to others **only** when it becomes public through
  pair removal.
- The UI **animates from authoritative state**, never from a local guess — no
  optimistic reveal of hidden cards.
- Screen-reader labels follow the same rule: own cards named; **opponents by
  count/position only** ([accessibility](../02-design-system/accessibility.md)).

## Turn clarity (make every turn obvious)

- `TurnBanner` states whose turn it is in text ("Tamaro varo!" / "Waiting for
  {name}…") — doubles as the ARIA live announcement.
- Active seat gets a **turn pulse** (reduced-motion → static ring).
- Optional `TurnTimer` ring only when the rule pack sets `turnSeconds`; conveys time
  by ring + numerals + color (not color alone).

## Reduced-motion table

- Deals/draws → fade + immediate position update; pair dissolve → single static
  accent; turn pulse → static highlight. **No essential info lost.** (See
  [motion](../02-design-system/motion-and-animation.md).)

## Reconnect on the table

- Loss shows the seat as `disconnected` (not removed) for a 60s grace; overlay for
  the affected user. On rejoin, the client **fetches the public snapshot + its own
  hand** and resumes — never replays local assumptions
  ([reconnect flow](./user-flows.md#4-returning-disconnected-player-reconnect)).

## Acceptance checklist

- [ ] No opponent card identity ever reaches the client (verified via network/RLS test).
- [ ] Draw is tap-only; eligible cards indicated by lift + icon + position, not color alone.
- [ ] Face reveal + pair animation run only after server confirmation.
- [ ] Turn state obvious in text + position + motion; announced to screen readers.
- [ ] Legible for seniors (card size) in EN/GU/HI at 200% text.
- [ ] Works portrait mobile, tablet, and desktop 16:10; bottom-sheet on mobile.
