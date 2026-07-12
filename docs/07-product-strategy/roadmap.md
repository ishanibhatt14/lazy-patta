# Roadmap

Phased delivery that ships something playable early, then layers depth. Estimated
solo build: **~8–12 part-time weeks** to MVP, depending on animation polish and
multiplayer edge cases.

## Delivery phases

### Phase 0 — Foundation (2–3 days)

Repo + monorepo scaffold, environments, Supabase project, CI, `play.lazytraveler.app`
subdomain. **Exit:** empty apps build + deploy; CI green.

### Phase 1 — Design system & engine (1–2 weeks)

Design tokens + core components; **Gadha Chor rule engine** with full unit +
property tests; server-side shuffle/deal; bot mode. **Exit:** engine passes all
invariants; components exist in `shared-ui`.

### Phase 2 — Web computer MVP (1–2 weeks)

Responsive game table, tutorial, sound, **EN/GU/HI**, guest play vs bots; family
testing. **Exit:** a stranger can play a full match vs computer on the web in ≤ 3 taps.

### Phase 3 — Auth & live rooms (2–3 weeks)

Login (OTP/Apple/Google), profile, lobby, **server-authoritative** actions,
reconnect, report/block. **Exit:** a private multi-device family match completes with
no card leakage.

### Phase 4 — Mobile packaging (1–2 weeks)

Expo screens, secure session storage, push notifications, TestFlight / Play internal.
**Exit:** installable iOS + Android internal builds pass smoke tests.

### Phase 5 — Polish & stores (1–2 weeks)

Accessibility hardening, privacy/deletion, screenshots, review notes, staged launch.
**Exit:** [launch checklist](./launch-checklist.md) fully green.

## 12-month view

| Quarter | Theme                 | Highlights                                                                                                                                |
| ------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1**  | Launch Gadha Chor     | Phases 0–5; web then iOS/Android; Classic Cream; Diwali theme pilot                                                                       |
| **Q2**  | Depth & delight       | Night Table dark theme; recorded **Gujarati voice pack** (D-35); achievements; bot difficulty v2 (memory/heuristics); reconnect hardening |
| **Q3**  | Second game           | **Lal Satti** (proves the framework); family groups; more festival themes (Holi/Navratri/Uttarayan)                                       |
| **Q4**  | Trick-taking category | **Judgement (Kachuful)** + shared **trick engine** (unlocks Mendicot/3-2-5); tutorials/AI-coach exploration                               |

## Future games (backlog, framework-ready)

Lal Satti → Judgement → Mendicot → 3-2-5 → Bluff → more. Trick-taking games share a
reusable trick engine ([framework](../04-games/game-design-framework.md)); each new
game is mostly rules + content, not a new app.

## AI roadmap (post-MVP)

- **Bot difficulty v2:** memory/card-counting + light heuristics (base game stays
  luck-forward by design — [gadha-chor bots](../04-games/gadha-chor.md#6-bot-behavior)).
- **AI coach / tutor:** explains "why" during the tutorial and optionally in-game
  ("draw here to avoid the donkey"), in all three languages.
- **Smarter matchmaking within family groups** (still private, never public random).

## Ecosystem cross-promotion

Gentle, tasteful cross-links with **Lazy Traveler** (and future Lazy apps) — shared
`lazytraveler.app` domain, consistent brand — without merging codebases
([ecosystem](../README.md#the-lazy-ecosystem)). No aggressive upsell; family-first tone.

## Milestone gates (must be true to advance)

- **→ Phase 2:** engine invariants all pass; tokens/components in place.
- **→ Phase 3:** guest web MVP validated with real family testers.
- **→ Phase 4:** live rooms complete cross-device with zero hand leakage.
- **→ Launch:** [launch checklist](./launch-checklist.md) green, incl. accessibility,
  privacy/deletion, and store materials.
