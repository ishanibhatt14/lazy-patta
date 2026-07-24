# Color

Warm, folk, high-contrast, non-casino. The palette does double duty: it must feel
like a Gujarati family home _and_ pass WCAG AA for a multi-generational audience.

## Semantic palette (Mehfil Table — production default)

Teal-led: the deep peacock teal is the primary action/heading color; marigold
saffron is the small warm accent (focus rings, highlights); maroon steps back to a
heritage role on **card backs**, no longer leading the UI.

| Semantic token       | Hex       | Notes                                                |
| -------------------- | --------- | ---------------------------------------------------- |
| `bg.canvas`          | `#F6F0E5` | warm cream paper — app background                    |
| `surface`            | `#FFFFFF` | cards, sheets, panels                                |
| `surface.sunken`     | `#F6ECD8` | wells/inputs on cream                                |
| `action.primary`     | `#0E6B63` | deep peacock teal — primary action/heading           |
| `action.primary.ink` | `#F6F0E5` | cream text on teal (AA+)                             |
| `brand.accent`       | `#F6A623` | marigold saffron — accent; **dark text only**        |
| `brand.accent.ink`   | `#1F1B16` | text on saffron                                      |
| `card.back`          | `#7A1F2B` | deep maroon — heritage card backs                    |
| `card.back.ink`      | `#FFFFFF` | text/pips on maroon (AA+)                            |
| `game.felt`          | `#0D5B4F` | deep felt green — the table                          |
| `game.felt.ink`      | `#FFFFFF` | text on felt (AA+)                                   |
| `text.primary`       | `#1F1B16` | ink                                                  |
| `text.secondary`     | `#5B534A` | muted text (verify AA on cream/surface)              |
| `text.onDark`        | `#F6F0E5` | text on dark surfaces                                |
| `border.subtle`      | `#E7DcC4` | hairlines on cream                                   |
| `status.error`       | `#C62828` | errors/destructive                                   |
| `status.success`     | `#0D5B4F` | success (reuses felt family)                         |
| `status.warning`     | `#B26A00` | warnings (dark saffron for contrast)                 |
| `status.info`        | `#0E6B63` | info (teal)                                          |
| `focus.ring`         | `#0E6B63` | teal keyboard focus (≥3:1; sits on cream via offset) |

## Contrast & usage rules (hard)

1. **Saffron is decorative or takes dark text.** Never small saffron text on cream —
   it fails contrast. Saffron fills get `text.primary` on top. As an accent (marigold)
   it must never be the focus-ring color: on cream/white it drops below 3:1.
2. **Light text is allowed** on teal, maroon, and felt green (all pass AA). Teal is
   the primary fill; cream text on the deep teal reads ≈6:1.
3. **Body text ≥ 4.5:1**, large text ≥ 3:1, UI/graphics ≥ 3:1. Verify every pairing.
4. **Never color-only meaning.** Turn state, selection, error — always paired with
   text/icon/position (see [accessibility](./accessibility.md)).
5. **Focus is always visible** on web — `focus.ring` with ≥3:1 against neighbors.

## Approved foreground/background pairings

| Background               | Allowed text                     | For                      |
| ------------------------ | -------------------------------- | ------------------------ |
| `bg.canvas` (cream)      | `text.primary`, `action.primary` | body, headings           |
| `surface` (white)        | `text.primary`, `text.secondary` | cards, sheets            |
| `action.primary` (teal)  | `action.primary.ink` (cream)     | primary buttons, headers |
| `brand.accent` (saffron) | `brand.accent.ink` (dark)        | accent chips, highlights |
| `card.back` (maroon)     | white                            | card backs               |
| `game.felt` (green)      | white                            | table labels             |

## Primitive scales (author these for token tiers/themes)

Generate consistent tint/shade ramps (e.g. 50–900) for each hue so semantic tokens
and themes can pick appropriate steps and states (hover/pressed/disabled):

- **teal** (primary) · **saffron** (accent) · **maroon** (card backs) · **felt**
  (game) · **cream/paper** (neutrals warm) · **ink** (text neutrals) · **red**
  (error). Keep neutrals _warm_ (paper/ink), never cold gray — cold gray reads
  corporate and breaks the homely feel.

State derivations (per interactive color):

- **hover:** −6–8% lightness · **pressed:** −12–15% · **disabled:** reduce
  saturation + `text.secondary`, maintain ≥3:1 shape contrast.

## Theme note

These are Mehfil Table (light) values. **Night Table** (dark) and **festival** themes
remap the same semantic tokens to different primitives — components don't change.
See [themes](./themes.md).
