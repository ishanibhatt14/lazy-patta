# Color

Warm, folk, high-contrast, non-casino. The palette does double duty: it must feel
like a Gujarati family home _and_ pass WCAG AA for a multi-generational audience.

## Semantic palette (Classic Cream — production default)

| Semantic token         | Hex       | Notes                                            |
| ---------------------- | --------- | ------------------------------------------------ |
| `bg.canvas`            | `#FFF7E8` | cream paper — app background                     |
| `surface`              | `#FFFFFF` | cards, sheets, panels                            |
| `surface.sunken`       | `#F6ECD8` | wells/inputs on cream                            |
| `brand.primary`        | `#7A1F2B` | deep maroon — primary action/brand               |
| `brand.primary.ink`    | `#FFFFFF` | text on maroon (AA+)                             |
| `brand.accent`         | `#F6A623` | saffron — accent; **dark text only on it**       |
| `brand.accent.ink`     | `#1F1B16` | text on saffron                                  |
| `action.secondary`     | `#0F766E` | teal — secondary action + playable glow          |
| `action.secondary.ink` | `#FFFFFF` | text on teal (AA+)                               |
| `game.felt`            | `#1F6B4F` | felt green — the table                           |
| `game.felt.ink`        | `#FFFFFF` | text on felt (AA+)                               |
| `text.primary`         | `#1F1B16` | ink                                              |
| `text.secondary`       | `#5B534A` | muted text (verify AA on cream/surface)          |
| `text.onDark`          | `#FFF7E8` | text on dark surfaces                            |
| `border.subtle`        | `#E7DcC4` | hairlines on cream                               |
| `status.error`         | `#C62828` | errors/destructive                               |
| `status.success`       | `#1F6B4F` | success (reuses felt family)                     |
| `status.warning`       | `#B26A00` | warnings (dark saffron for contrast)             |
| `status.info`          | `#0F766E` | info (teal)                                      |
| `focus.ring`           | `#0F766E` | visible keyboard focus (≥3:1 on adjacent colors) |

## Contrast & usage rules (hard)

1. **Saffron is decorative or takes dark text.** Never small saffron text on cream —
   it fails contrast. Saffron fills get `text.primary` on top.
2. **White text is allowed** on maroon, teal, and felt green (all pass AA).
3. **Body text ≥ 4.5:1**, large text ≥ 3:1, UI/graphics ≥ 3:1. Verify every pairing.
4. **Never color-only meaning.** Turn state, selection, error — always paired with
   text/icon/position (see [accessibility](./accessibility.md)).
5. **Focus is always visible** on web — `focus.ring` with ≥3:1 against neighbors.

## Approved foreground/background pairings

| Background                | Allowed text                     | For                      |
| ------------------------- | -------------------------------- | ------------------------ |
| `bg.canvas` (cream)       | `text.primary`, `brand.primary`  | body, headings           |
| `surface` (white)         | `text.primary`, `text.secondary` | cards, sheets            |
| `brand.primary` (maroon)  | `brand.primary.ink` (white)      | primary buttons, headers |
| `brand.accent` (saffron)  | `brand.accent.ink` (dark)        | accent chips, highlights |
| `action.secondary` (teal) | white                            | secondary buttons        |
| `game.felt` (green)       | white                            | table labels             |

## Primitive scales (author these for token tiers/themes)

Generate consistent tint/shade ramps (e.g. 50–900) for each hue so semantic tokens
and themes can pick appropriate steps and states (hover/pressed/disabled):

- **maroon** (brand) · **saffron** (accent) · **teal** (secondary) · **felt**
  (game) · **cream/paper** (neutrals warm) · **ink** (text neutrals) · **red**
  (error). Keep neutrals _warm_ (paper/ink), never cold gray — cold gray reads
  corporate and breaks the homely feel.

State derivations (per interactive color):

- **hover:** −6–8% lightness · **pressed:** −12–15% · **disabled:** reduce
  saturation + `text.secondary`, maintain ≥3:1 shape contrast.

## Theme note

These are Classic Cream values. **Night Table** (dark) and **festival** themes
remap the same semantic tokens to different primitives — components don't change.
See [themes](./themes.md).
