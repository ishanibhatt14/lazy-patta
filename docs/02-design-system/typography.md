# Typography

Type must render **English, Gujarati, and Devanagari** beautifully and legibly for
seniors and kids. Legibility outranks flourish everywhere except large display.

## Type families

| Role | Font | Notes |
|------|------|-------|
| **UI / body** | **Noto Sans** | superb legibility, huge script coverage |
| **Gujarati** | **Noto Sans Gujarati** | mandatory glyph coverage |
| **Hindi** | **Noto Sans Devanagari** | mandatory glyph coverage |
| **Display / headings** | a warm **rounded** licensed display face | **only** if it renders all three scripts well; **otherwise fall back to Noto Sans SemiBold**. Never ship a display face that lacks Gujarati/Devanagari — mixed-script fallback looks broken. |

Font tokens: `font.body`, `font.display`, `font.gujarati`, `font.devanagari`.
The rendering layer selects the correct script font per string locale
automatically (font stacks + `:lang()` / per-locale families in RN).

## Type scale

Modular, mapped to `text.*` size tokens. Sizes in px (rem in code). Line-height via
`leading.*`. Weight via `weight.*` (`400` regular, `600` semibold, `700` bold).

| Token | Size | Line-height | Weight | Use |
|-------|------|-------------|--------|-----|
| `text.display` | 40 | 48 | 700 | splash, big reveals |
| `text.h1` | 32 | 40 | 700 | screen titles |
| `text.h2` | 24 | 32 | 600 | section headers |
| `text.h3` | 20 | 28 | 600 | card titles, sheet headers |
| `text.bodyLg` | 18 | 28 | 400 | primary reading, senior-friendly default |
| `text.body` | 16 | 24 | 400 | default UI text |
| `text.bodySm` | 14 | 20 | 400 | secondary/meta |
| `text.caption` | 12 | 16 | 400/600 | labels, captions (use sparingly) |
| `text.button` | 16 | 24 | 600 | button labels |
| `text.overline` | 12 | 16 | 600 | eyebrows/tags (tracking +) |

**Senior mode / large text:** the whole scale steps up (e.g. body → 18/20) via a
single accessibility setting; layouts must not clip. Support OS Dynamic Type
(iOS) and font scaling (Android/web) up to **200%** without loss of content —
verified in CI (see [accessibility](./accessibility.md)).

## Multi-script rules

- **Never concatenate translated fragments** — full strings only (ICU). Type layout
  assumes whole-sentence strings (see [voice-and-copywriting](../01-brand/voice-and-copywriting.md)).
- **Gujarati/Devanagari run longer and taller** than English — design components
  with flexible height and test with pseudo-loc + longest-string fixtures.
- **Card ranks/suits are semantic keys** rendered through the type system, not baked
  into card art, so they localize and scale.
- Set correct **`lang`**/locale on containers so the right script font and hyphenation apply.

## Measure & rhythm

- Max line length on web ≈ **70 characters** (`layout.maxLine`).
- Vertical rhythm follows the 8-pt spacing scale; prefer `leading.*` tokens over
  ad-hoc line-heights.
- Headings use `font.display`; everything functional uses `font.body` for clarity.

## Do / don't

**Do**

- Default to `text.body`/`text.bodyLg` for anything a grandparent reads.
- Keep numerals and card indices large and unambiguous.
- Test every screen in all three languages at 100% and 200%.

**Don't**

- Don't use the display face for long body copy or for scripts it can't render.
- Don't rely on tiny `text.caption` for essential information.
- Don't letter-space Gujarati/Devanagari (breaks conjuncts).
