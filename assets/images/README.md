# Brand assets (canonical source)

This directory is the **single source of truth** for the Lazy Patta logo. The web
app and the future Expo app each reference their own platform copies; update those
whenever a file here changes.

## Files

| File                                         | Size      | Mode               | Background       | Use                                                                |
| -------------------------------------------- | --------- | ------------------ | ---------------- | ------------------------------------------------------------------ |
| `lazy-patta-logo-transparent.png`            | 1024×1024 | RGBA (transparent) | none             | In-app headers, welcome screen, website, marketing, splash artwork |
| `lazy-patta-ios-icon-opaque-maroon-1024.png` | 1024×1024 | RGB (no alpha)     | maroon `#7A1F2B` | iOS/Android launcher icon, PWA/Apple touch icon                    |

`#7A1F2B` is the design-system `primitives.maroon` (= `action.primary`), so the
opaque background matches the app chrome exactly.

## Why two variants

- **Transparent** — flexible over any surface; keeps the ornamental frame's edges
  clean against light or dark backgrounds.
- **Opaque maroon** — iOS applies its own rounded-rect mask and forbids alpha, so
  the app icon must fill an opaque square. Android masks a foreground/background
  pair via `adaptiveIcon`; use the maroon fill as the background layer.

## Platform copies

- **Web** — mirrored into `apps/web/public/images/` (Next serves only from `public/`),
  referenced as `/images/lazy-patta-logo-transparent.png` etc.
- **Expo (Phase 4)** — point `expo.icon` / `expo.ios.icon` at the opaque variant and
  the splash icon at the transparent one. See the Expo config when that app lands.

## Store-icon follow-up (do NOT skip before submission)

The full wordmark's tagline ("The card games we grew up playing") is **unreadable**
at home-screen icon sizes. Before store submission, produce a **simplified** store
icon — cards + bell + ornamental frame + an optional LP monogram, no tagline. The
full logo stays inside the app. Also export dedicated 192×192 and 512×512 PWA icons
for crisper small renders instead of downscaling the 1024² source.
