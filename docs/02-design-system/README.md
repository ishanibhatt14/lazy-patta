# 02 · Design System

The foundation. **No screen is "done" until it is expressed purely in tokens and
components defined here.** If a screen needs something new, add it to the design
system first, then use it. This is the design principle the whole Bible is built
around: define the system once, compose every screen and every future game from it.

## Layered model

```
Primitives  →  Semantic tokens  →  Components  →  Patterns  →  Screens
(raw values)   (roles/intent)      (reusable UI)  (compositions) (03 · UX)
```

- **Primitives** never appear in components directly (e.g. `saffron-500`).
- **Semantic tokens** map role → primitive (e.g. `brand.accent → saffron-500`) and
  are the _only_ thing components reference. Theming = remapping semantic tokens.
- **Components** are the shadcn/Tailwind + React building blocks with typed props.
- **Patterns** compose components (e.g. the game-table layout).
- **Screens** (section 03) compose patterns; they hold no raw values.

## Documents

| Doc                                             | Purpose                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| [Design Tokens](./design-tokens.md)             | The token model + spacing, radius, elevation, z-index, breakpoints |
| [Color](./color.md)                             | Palette, semantic roles, contrast rules                            |
| [Typography](./typography.md)                   | Type scale, fonts, multi-script rules                              |
| [Components](./components.md)                   | Full component inventory, states, and props                        |
| [Motion & Animation](./motion-and-animation.md) | Motion tokens + every game animation spec                          |
| [Themes](./themes.md)                           | Classic Cream, Night Table, festival themes                        |
| [Accessibility](./accessibility.md)             | WCAG criteria + card/turn-specific rules                           |

## Code mapping (how tokens become code)

The token layer is authored to map 1:1 across Figma and code:

- **Figma:** Figma **Variables** (color/spacing/radius/type/elevation/motion) with
  **modes** per theme; **Auto Layout** and **Variants** for components.
- **Code:** tokens exported as **CSS custom properties** + a **Tailwind theme**
  (`packages/design-tokens`), consumed by **shadcn/ui** components and **Framer Motion**
  variants. React Native (Expo) consumes the same token JSON.
- **Single source of truth:** tokens are defined once (design-tokens.md ⇢
  `packages/design-tokens`) and every platform reads from that. Never hard-code a value.
