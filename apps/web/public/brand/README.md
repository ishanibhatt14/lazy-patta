# Web brand assets (served at `/brand/...`)

Next.js serves files here at the site root, e.g. `/brand/lazy-patta-logo-transparent.png`.
These are **copies** of the canonical sources in `/assets/images/` — keep them in
sync.

## Required files (drop these in)

| File | Referenced by |
| --- | --- |
| `lazy-patta-logo-transparent.png` | Home hero (`app/page.tsx`) and favicon (`app/layout.tsx` → `metadata.icons.icon`) |
| `lazy-patta-ios-icon-opaque-maroon-1024.png` | Apple touch icon (`metadata.icons.apple`) and PWA manifest icons (`app/manifest.ts`) |

Until these PNGs are added the references resolve to 404 at runtime (the build
still passes). Copy them from the canonical source:

```bash
cp assets/images/lazy-patta-logo-transparent.png \
   apps/web/public/brand/lazy-patta-logo-transparent.png
cp assets/images/lazy-patta-ios-icon-opaque-maroon-1024.png \
   apps/web/public/brand/lazy-patta-ios-icon-opaque-maroon-1024.png
```

See `/assets/images/README.md` for provenance, the transparent-vs-opaque rationale,
and the pre-submission simplified-store-icon follow-up.
