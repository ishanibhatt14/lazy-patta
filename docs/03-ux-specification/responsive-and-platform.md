# Responsive & Platform

One design system, three form factors, three platforms (web, iOS, Android). Layout
adapts; components and tokens do not fork.

## Breakpoints & frames

| Target                       | Frame     | Breakpoint token |
| ---------------------------- | --------- | ---------------- |
| Android phone (design floor) | 360×800   | `bp.sm`          |
| iPhone                       | 390×844   | `bp.md`          |
| Tablet                       | 768×1024  | `bp.lg`          |
| Desktop web                  | 1440×1024 | `bp.xl`          |

Design to the **360-wide floor** first (smallest common Android), then scale up.

## Layout rules by form factor

- **Phone (portrait-first):** single column; bottom `TabBar`; game table portrait
  with bottom hand; **bottom sheets** instead of side panels; primary actions in the
  thumb zone (one-hand mode).
- **Tablet:** more generous gutters and larger cards; may show a side panel in
  lobby; table still portrait-biased but with breathing room.
- **Desktop web:** left `NavRail`; game table centered in a **16:10** play area with
  an optional **right panel** (room info + reactions); max text measure ~70ch.

## Platform conventions

- **iOS:** follow Human Interface Guidelines for familiar patterns (navigation,
  sheets, Dynamic Type, Sign in with Apple) while keeping the Lazy Patta identity.
  Safe-area insets respected.
- **Android:** Material-friendly touch/back behavior; system font scaling; predictive
  back where available.
- **Web/PWA:** installable, keyboard-operable, visible focus; deep links + invite
  routes; SSR marketing pages ([architecture](../05-architecture/system-architecture.md)).

## Orientation

- **Portrait-first** everywhere; the table is designed for portrait. Landscape is
  supported gracefully on tablet/desktop but never required.

## Shared vs platform-specific

| Shared (write once)                          | Platform-specific (thin)                      |
| -------------------------------------------- | --------------------------------------------- |
| Game engine, contracts, tokens, localization | Auth provider wiring (Apple/Google)           |
| Component API + design tokens                | Navigation shell (Expo Router vs Next routes) |
| Copy, i18n, animations spec                  | Haptics, push registration, safe areas        |

## Density & input

- **48×48 minimum targets** on every platform; larger in senior mode.
- **Tap over drag** universally; the table requires no drag.
- Hover states are web-only enhancements; never required for function.

## Testing surface

- Visual checks at all four frames, in EN/GU/HI, at 100% and 200% text.
- iOS Safari + Android Chrome + desktop Chrome/Firefox/Safari for web.
- Expo builds on a low-end Android device as the performance floor.
