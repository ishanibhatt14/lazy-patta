# Design Tokens

Tokens are the atoms of the product. They exist once, are named by **role**, and
map to platform outputs (CSS variables, Tailwind theme, React Native, Figma
Variables). **Components reference semantic tokens only** — never raw values.

## Token tiers

1. **Primitive** — raw, theme-agnostic scales (`saffron-500 = #F6A623`). Not used
   directly by components.
2. **Semantic** — role/intent, mapped to a primitive per theme
   (`brand.accent → saffron-500`). The only tier components consume.
3. **Component** — optional per-component overrides that still resolve to semantic
   tokens (`button.primary.bg → brand.primary`).

Theming (Classic Cream → Night Table → Diwali) only remaps tiers 2/3 — see
[themes](./themes.md).

## Naming convention

`category.role[.variant][.state]` in dot notation, e.g. `bg.canvas`,
`text.primary`, `action.secondary`, `game.felt`, `status.error`.
In code these become `--lp-bg-canvas`, `bg-canvas` (Tailwind), `tokens.bg.canvas` (RN).

## Color tokens

Full palette and contrast rules: [color](./color.md). Core semantic set:

| Token              | Value (Classic Cream) | Role                                    |
| ------------------ | --------------------- | --------------------------------------- |
| `bg.canvas`        | `#FFF7E8`             | app background (cream paper)            |
| `surface`          | `#FFFFFF`             | cards, sheets, panels                   |
| `brand.primary`    | `#7A1F2B`             | deep maroon — primary brand/action      |
| `brand.accent`     | `#F6A623`             | saffron — accent (dark text on it)      |
| `action.secondary` | `#0F766E`             | teal — secondary actions, playable glow |
| `game.felt`        | `#1F6B4F`             | felt green — the play table             |
| `text.primary`     | `#1F1B16`             | ink — primary text                      |
| `status.error`     | `#C62828`             | errors, destructive                     |

## Spacing scale (8-point system)

Base unit = **8px**. Use `space.*` tokens; avoid arbitrary values.

| Token     | px  | Typical use                            |
| --------- | --- | -------------------------------------- |
| `space.0` | 0   | reset                                  |
| `space.1` | 4   | hairline gaps, icon-text               |
| `space.2` | 8   | tight padding, chip internals          |
| `space.3` | 12  | control inner padding                  |
| `space.4` | 16  | default component padding, list gaps   |
| `space.5` | 24  | section spacing                        |
| `space.6` | 32  | large section spacing                  |
| `space.7` | 48  | screen gutters (also min touch target) |
| `space.8` | 64  | hero spacing                           |

4px (`space.1`) is the only sub-8 step, reserved for fine detail.

## Radius scale

Matches the brand's rounded language (brand-guidelines).

| Token         | px   | Use                         |
| ------------- | ---- | --------------------------- |
| `radius.sm`   | 8    | chips, small controls       |
| `radius.md`   | 12   | **controls/buttons/inputs** |
| `radius.lg`   | 16   | playing cards               |
| `radius.xl`   | 20   | cards, sheets, dialogs      |
| `radius.2xl`  | 28   | hero panels                 |
| `radius.full` | 9999 | avatars, pills, timer ring  |

## Elevation / shadow

Soft and shallow — **never** glossy/casino. Shadows use warm-tinted, low-opacity.

| Token         | Use                              | Character           |
| ------------- | -------------------------------- | ------------------- |
| `elevation.0` | flat on canvas                   | none                |
| `elevation.1` | resting card/tile                | subtle, 2–4px blur  |
| `elevation.2` | raised/hover, playable card lift | soft, 6–10px        |
| `elevation.3` | sheets, dialogs, menus           | 12–20px, diffuse    |
| `elevation.4` | modal/overlay top layer          | largest, still soft |

## Sizing tokens

| Token                      | px           | Use                                             |
| -------------------------- | ------------ | ----------------------------------------------- |
| `size.touch.min`           | 48           | **minimum interactive target** (a11y hard rule) |
| `size.control.height`      | 48           | default control height                          |
| `size.icon.sm/md/lg`       | 16 / 24 / 32 | icon sizes                                      |
| `size.avatar.sm/md/lg`     | 32 / 48 / 64 | avatars/seats                                   |
| `size.card.w` (responsive) | —            | see [components · PlayingCard](./components.md) |

## Typography tokens

Defined in [typography](./typography.md); referenced as `font.*`, `text.*` (size),
`leading.*`, `weight.*`. Multi-script (Latin/Gujarati/Devanagari) is mandatory.

## Motion tokens

Defined in [motion-and-animation](./motion-and-animation.md); referenced as
`motion.duration.*`, `motion.ease.*`. All animations must honor `prefers-reduced-motion`.

## Layout tokens

| Token                | Value          | Use                              |
| -------------------- | -------------- | -------------------------------- |
| `layout.maxLine`     | ~70ch          | max text measure on web          |
| `layout.gutter`      | `space.7` (48) | screen edge gutters (web/tablet) |
| `layout.play.aspect` | 16:10          | desktop centered play area       |

### Breakpoints

| Token   | Min width | Target                       |
| ------- | --------- | ---------------------------- |
| `bp.sm` | 360       | Android phone (design floor) |
| `bp.md` | 390       | iPhone                       |
| `bp.lg` | 768       | tablet                       |
| `bp.xl` | 1440      | desktop web                  |

### Z-index scale

| Token                | Layer                                          |
| -------------------- | ---------------------------------------------- |
| `z.base` (0)         | content                                        |
| `z.seat` (10)        | player seats/cards                             |
| `z.overlayGlow` (20) | playable-card glow/lift                        |
| `z.sticky` (30)      | turn banner, top bar                           |
| `z.sheet` (40)       | bottom sheets                                  |
| `z.dialog` (50)      | dialogs/modals                                 |
| `z.toast` (60)       | toasts                                         |
| `z.reconnect` (70)   | offline/reconnect overlay (must sit above all) |

## Governance

- Add a token **before** using a new value; PRs introducing raw hex/px/ms in a
  component should fail review (lint rule in [developer-handbook](../06-developer-handbook/coding-standards.md)).
- Token names are stable API — renames require a migration note in
  [decisions-log](../00-product-bible/decisions-log.md).
