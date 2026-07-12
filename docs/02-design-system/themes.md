# Themes

Theming is **semantic-token remapping only** — components, layout, spacing, and
motion never change between themes. This is what makes "add a Diwali theme" a
token/asset swap, not a rebuild, and what will keep every future game consistent.

## How theming works

- Each theme is a **mode** that remaps tier-2 semantic tokens (and a few assets:
  textures, mascot cloth, optional music bed) to different primitives.
- In **Figma**: Variable **modes** per theme.
- In **code**: a `data-theme` attribute / theme provider swaps the CSS-variable set
  (`packages/design-tokens`); RN swaps the token JSON object. One switch, whole app.
- **Contrast is re-verified per theme** — a theme is not done until it passes the
  same WCAG AA rules as Classic Cream ([accessibility](./accessibility.md)).

## Classic Cream — production default (MVP)

The warmest, most on-brand look; ships first (see
[decisions D-40](../00-product-bible/decisions-log.md)).

- Cream canvas (`#FFF7E8`), white surfaces, maroon/saffron/teal/felt as defined in
  [color](./color.md). Soft warm shadows, cream-paper texture, subtle Bandhani.

## Night Table — dark theme

For low-light family play. Not just inverted — a **warm dark**, like a lamp-lit
table at night.

Remapping intent (author exact values against AA):

| Semantic token | Night Table intent |
|----------------|--------------------|
| `bg.canvas` | deep warm brown/near-black (not cold gray/black) |
| `surface` | slightly lifted warm dark |
| `text.primary` | warm off-white (`text.onDark`) |
| `brand.primary` | maroon lightened for contrast on dark |
| `brand.accent` | saffron holds (still dark text on saffron fills) |
| `game.felt` | deeper felt green |
| shadows | replaced by subtle light/borders (shadows read poorly on dark) |

Rules: keep neutrals **warm**; re-check every foreground/background pair; card
faces stay high-contrast and legible; mascot/festival dressing recolor via tokens.

## Festival themes

Seasonal delight, same token system. **Diwali first**
([decisions D-41](../00-product-bible/decisions-log.md)) — proves the pipeline.

Festival themes may adjust:

- accent warmth and background texture (e.g. more diyas/toran dressing),
- celebration particles and the winner-reveal flourish,
- optional seasonal music bed and mascot cloth,

…but **never** layout, spacing, component structure, or legibility. Ideas for the
roadmap: **Diwali**, **Holi** (playful color accents, still tasteful), **Navratri**,
**Uttarayan/Makar Sankranti** (kite motifs — very Gujarati).

Festival themes can auto-suggest during their window (opt-in), tie into
achievements (e.g. "Diwali Night"), and revert to Classic Cream by default.

## Theme selection & persistence

- User setting: **System / Classic Cream / Night Table / (active festival)**.
- Default = Classic Cream; "System" maps light→Cream, dark→Night Table.
- Persisted per profile (and locally for guests). Respects OS dark-mode + reduced-motion.

## Acceptance checklist (per theme)

- [ ] All semantic tokens remapped; **zero** component/layout changes required.
- [ ] Every text/bg pairing passes WCAG AA (re-verified for this theme).
- [ ] Card faces and turn/selection states remain clearly legible.
- [ ] Not color-only meanings still hold.
- [ ] Mascot, textures, and celebration assets recolor cleanly via tokens.
- [ ] Verified in EN / GU / HI at 100% and 200%.
