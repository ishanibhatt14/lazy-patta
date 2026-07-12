# Illustration & Texture

Art direction for everything drawn: backgrounds, cards, empty states, badges,
festival dressing. The goal is **premium folk craft** — handmade warmth, never
clip-art, never casino.

## Art-direction pillars

1. **Handmade over synthetic.** Reference block-print, handloom, and paper craft.
   Slight imperfection reads as warmth; perfect gradients read as corporate.
2. **Texture in service of legibility.** Backgrounds carry subtle grain and
   pattern; content sits on calm surfaces with strong contrast. Pattern never
   fights the cards or text.
3. **Restraint.** One or two folk motifs per screen, not a collage. Whitespace
   (cream space) is part of the premium feel.

## Motif library

| Motif                           | Origin               | Where it's used                                | Notes                                                                                         |
| ------------------------------- | -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Bandhani dots**               | Gujarati tie-dye     | dividers, card backs, particle bursts on pairs | small, rhythmic dot fields; the pair-removal "confetti" is Bandhani dots, not casino sparkles |
| **Ajrakh block-print**          | Kutch/Sindh printing | hero panels, section headers, splash           | geometric, indigo/maroon/saffron; subtle at low opacity                                       |
| **Folk geometric borders**      | pan-Indian           | cards, sheets, badges                          | frame elements with restraint                                                                 |
| **Toran / string lights**       | festival doorways    | lobby, festival themes, winner reveal          | dressing only; off by default outside festival theme                                          |
| **Diya / warm glow**            | festival             | celebrations, achievements                     | soft, never neon                                                                              |
| **Chai / khakhra / wood grain** | home                 | empty states, "cozy" moments                   | signals _home_, not venue                                                                     |

## Playing-card art

The cards are the product's hero object — treat them as craft, not stock.

- **Faces:** clean, high-contrast, large indices for legibility at arm's length
  and for seniors. Ranks/suits are **semantic keys** (localizable), not baked text.
- **Card back:** a signature Bandhani/Ajrakh pattern in maroon + saffron on cream —
  distinctive enough to become brand shorthand (think the back of a Lazy Patta deck
  as an icon in its own right).
- **States** (map to the `PlayingCard` component): face, back, playable (soft teal
  glow + slight lift), selected, disabled, matched (flip + dissolve into Bandhani dots).
- **Accessibility:** never rely on suit color alone — pair color with the suit
  glyph and a screen-reader label (see [accessibility](../02-design-system/accessibility.md)).

## Empty, loading & error illustrations

Each non-content state gets a small **Gaddo** vignette + one warm line of copy —
these are brand moments, not dead ends:

| State                | Illustration idea                           | Tone                                          |
| -------------------- | ------------------------------------------- | --------------------------------------------- |
| Empty match history  | Gaddo shuffling a fresh deck                | inviting: "Your first game is waiting."       |
| Empty friends/family | Gaddo holding a toran of empty photo frames | warm: "Invite family to fill the table."      |
| Loading              | Gaddo "think" pose, cards riffling          | patient, cozy                                 |
| Offline              | Gaddo napping (zzz) under a diya            | calm: "You're offline. We'll reconnect you."  |
| Generic error        | Gaddo sheepish with a dropped card          | gentle: "Something slipped. Let's try again." |

## Achievement & badge system

Badges celebrate _play and togetherness_, never currency or "value." Style: folk
medallions with geometric borders and a small Gaddo or motif.

Examples (final list in [07 · product-strategy](../07-product-strategy/)):

- **First Game** · **First Pair** · **First Win**
- **Family Reunion** — a room with 4+ family members.
- **The Good Sport** — lost as Gadha Chor and immediately rematched.
- **Diwali Night** — played during the festival window (ties to festival theme).

No badge is buyable, tradable, or tied to a balance.

## Production notes

- Deliver as **SVG** (UI/decor) and **Lottie** (mascot/celebrations) where possible;
  raster only for rich illustrations, exported @1x/@2x/@3x.
- Keep everything on the **token palette** so festival/dark themes recolor cleanly.
- Provide a **still fallback** for every animated illustration (reduced-motion).
- Optimize aggressively — this must feel premium on a low-end Android phone.
