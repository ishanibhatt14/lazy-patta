# Accessibility

Accessibility is **audience-critical**, not a checkbox: grandparents and kids are
core users (see [target-audience](../00-product-bible/02-target-audience.md)). These
are acceptance criteria — a screen or component is not "done" until it passes.

## Acceptance criteria (WCAG 2.1 AA baseline + game specifics)

### Targets & input

- **48×48 minimum** touch target for all primary controls (`size.touch.min`).
- **No essential action requires dragging** — tap-first everywhere (draw = tap).
- **One-hand mode:** reachable primary actions in the bottom zone on mobile.
- Web is fully **keyboard-operable** with a **visible focus** ring (`focus.ring`, ≥3:1).

### Color & contrast

- Body text **≥ 4.5:1**; large text/UI/graphics **≥ 3:1** — verified per theme.
- **Never color alone.** Turn state, playable/selected cards, connection, errors,
  toggles — always **text + icon + position** in addition to color.
  - Turn → `TurnBanner` text + seat position + ring, not just a colored glow.
  - Playable card → lift + icon cue + label, not just teal.
  - Toggle → on/off text/icon, not just track color.

### Text & scaling

- Support **Dynamic Type (iOS)** and font scaling (Android/web) to **200% without
  clipping or loss of content** — enforced by CI visual checks.
- **Senior mode / large text** bumps the whole type scale via one setting
  ([typography](./typography.md)).
- Max measure ~70ch on web for readability.

### Screen readers

- **Every icon and icon-button has an accessible label** (`aria-label`/RN
  `accessibilityLabel`).
- **Every card action has a screen-reader description** (e.g. "Draw a card from
  Meera. 3 cards remaining.").
- Own face-up cards are labeled ("Jack of spades"). **Opponent cards are announced
  by position/count only, never identity** (anti-cheat + truth: the client doesn't
  have opponent identities).
- Turn changes and results are announced via **ARIA live regions**
  (`TurnBanner`, `Toast`, `ResultCard`).

### Motion & audio

- **Reduced-motion** honored globally (OS + in-app toggle) — see
  [motion](./motion-and-animation.md). No essential info lost when motion is reduced.
- **Mute** and per-category volume; **every essential sound has a text/caption
  equivalent** — the game is fully playable silent.
- Respect OS "reduce/disable haptics."

### Language & cognition

- **English / Gujarati / Hindi** with correct script fonts and whole-sentence ICU
  strings ([voice-and-copywriting](../01-brand/voice-and-copywriting.md)).
- Plain, short copy; every turn made obvious; tutorial available.
- Consistent, predictable navigation and component behavior.

## Colorblind support

- Suits use **glyph + label + (optional) 4-color variant**, never hue alone.
- Provide a colorblind-friendly card option (e.g. 4-color suits) as a setting.
- Verify all status/turn/selection cues under deuteranopia/protanopia/tritanopia sims.

## Per-screen a11y spec (required in section 03)

Each screen in the [UX spec](../03-ux-specification/) must document:

- focus order & keyboard path (web),
- screen-reader reading order + labels for all interactive elements,
- live-region announcements (turn, errors, results),
- reduced-motion behavior,
- large-text (200%) layout behavior,
- one-hand reachability for primary actions.

## Testing

- **Automated:** contrast + a11y lint in CI; pseudo-loc & 200%-text visual snapshots.
- **Assistive tech:** VoiceOver (iOS/Safari), TalkBack (Android), NVDA/VoiceOver (web).
- **Manual:** keyboard-only pass; reduced-motion pass; colorblind sim pass;
  senior-mode pass; Gujarati/Hindi overflow pass.
- Part of the [testing strategy](../06-developer-handbook/testing-strategy.md) and a
  release gate in the [launch checklist](../07-product-strategy/launch-checklist.md).

## Non-negotiables (quick list)

1. 48×48 targets. 2. No drag-only actions. 3. Never color-only. 4. SR label on every
   control & card action. 5. Reduced-motion + mute always available. 6. 200% text, no
   clipping. 7. Visible keyboard focus. 8. Three languages, correct scripts.
