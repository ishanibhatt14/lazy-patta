# Motion & Animation

Motion adds warmth and clarity, never spectacle-for-its-own-sake. Every animation
is **token-driven**, has a **reduced-motion fallback**, and never blocks or hides
essential information. Implemented with **Framer Motion** (web) and **Reanimated**
(Expo), sharing the same duration/easing tokens.

## Motion tokens

### Durations (`motion.duration.*`)

| Token     | ms        | Use                                |
| --------- | --------- | ---------------------------------- |
| `instant` | 0         | reduced-motion position updates    |
| `fast`    | 120       | micro-interactions (press, toggle) |
| `base`    | 200       | standard UI transitions            |
| `deal`    | 320       | card deal (ease-out)               |
| `draw`    | 400       | card draw (ease-in-out)            |
| `pair`    | 500       | pair-found pop (spring)            |
| `pulse`   | 800       | turn pulse (subtle loop)           |
| `reveal`  | 1000–1200 | result reveal                      |

### Easing (`motion.ease.*`)

| Token      | Curve       | Use                      |
| ---------- | ----------- | ------------------------ |
| `standard` | ease-in-out | most transitions         |
| `entrance` | ease-out    | elements arriving (deal) |
| `exit`     | ease-in     | elements leaving         |
| `spring`   | spring/pop  | pair found, celebrations |
| `linear`   | linear      | timers, progress         |

## Reduced motion (global rule)

When `prefers-reduced-motion` (or the in-app toggle) is on:

- Large positional/scale animations → **cross-fade + immediate position update**
  (`motion.duration.instant/base`).
- Looping/pulsing animations → static state (e.g. turn pulse becomes a static ring).
- Particle bursts (Bandhani confetti) → a single static accent or none.
- **No essential feedback is lost** — the state still changes, just without travel.

## Signature game animations (specs)

### Shuffle (game start)

- Deck riffles/gathers at center; `motion.duration.base`–`deal`, `ease.standard`.
- Paired with the shuffle SFX ([sound-design](../01-brand/sound-design.md)).
- Reduced motion: deck appears assembled with a soft fade.

### Deal

- Cards fly from the deck to each seat in turn order; **`deal` (320ms), `ease.entrance`**,
  staggered ~40–60ms per card. Own cards land face-up in the `HandFan`; opponents' land as backs.
- Reduced motion: hands populate instantly with a fade.

### Initial pair removal

- After deal, auto-removed pairs flip up briefly then dissolve (see Pair found), so
  players _see_ the game becoming fair. Slightly quicker cadence than in-game pairs.

### Turn pulse

- The active seat/`TurnBanner` gets a subtle **`pulse` (800ms) loop** (soft glow/scale).
- Reduced motion: static highlighted ring + text ("Your turn").

### Draw interaction

- Eligible opponent card backs **lift + soft teal glow** (`elevation.2`,
  `action.secondary`). On tap, the chosen card slides to the drawing player:
  **`draw` (400ms), `ease.standard`**. No drag required.
- The card face is only revealed to the drawer per the anti-cheat contract
  ([game-table UI contract](../03-ux-specification/)); the animation of the _face_
  runs **after** the authoritative server response.

### Pair found (the signature beat)

- The two matching cards move to center, flip, and **dissolve into a Bandhani-dot
  particle burst**: **`pair` (500ms), `ease.spring`** + warm chime + success haptic.
- Celebratory but calm — no coin/jackpot imagery.
- Reduced motion: cards fade out with a single static sparkle; caption "Jodi mali gai!".

### Opponent turn / waiting

- Calm ambient state: bot/opponent seat pulses gently; optional Gaddo "think" pose.
- Bot pacing delay 500–1200ms feels human ([bot design](../04-games/gadha-chor.md)).

### Result reveal

- **Winner:** warm flourish, gentle confetti (folk motif), `reveal` (1000–1200ms).
- **Gadha Chor:** affectionate mascot reveal — cute, funny, never humiliating —
  then straight to a Rematch CTA ([mascot](../01-brand/mascot.md), [ResultCard](./components.md)).
- Reduced motion: result state fades in; mascot shows a still pose.

## Micro-interactions

| Element          | Motion                                             |
| ---------------- | -------------------------------------------------- |
| Button press     | scale 0.98, `fast`, `ease.standard` + light haptic |
| Toggle           | thumb slide `fast`; color+icon change              |
| Sheet open/close | slide-up/down `base`, `ease.entrance/exit`         |
| Toast            | slide+fade in, auto-dismiss fade out               |
| Card select      | lift + glow `fast`                                 |
| Reaction         | emote pops from seat, floats, fades (`base`)       |

## Performance & implementation rules

- Prefer **transform/opacity** (GPU-friendly); avoid animating layout/box-shadow in
  hot paths. Must stay smooth on low-end Android (target 60fps, degrade gracefully).
- Drive game animations from **authoritative state changes**, not local guesses —
  animate _after_ the server confirms (no card leakage, no desync).
- Every animated component exposes a `reducedMotion` path and a **still fallback**.
- Haptics accompany but never replace visual feedback; respect OS/in-app haptic toggle.
- Keep Lottie/particle payloads small and lazy-loaded.
