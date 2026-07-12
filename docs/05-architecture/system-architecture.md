# System Architecture

## Platforms

| Layer                   | Technology                                             | Notes                                             |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Web / marketing / PWA   | **Next.js** on **Vercel**                              | SSR marketing + app; `play.lazytraveler.app`      |
| Mobile                  | **Expo React Native** + **Expo Router**                | iOS + Android from shared TS                      |
| Shared code             | **TypeScript packages** in one monorepo                | engine, contracts, tokens, i18n                   |
| Backend                 | **Supabase**                                           | Auth, Postgres, Realtime, Storage, Edge Functions |
| Analytics/observability | privacy-conscious product analytics + error monitoring | never logs hands/tokens/OTP                       |

## Monorepo layout

```text
lazy-patta/
  apps/
    web/                  # Next.js (marketing + web app/PWA)
    mobile/               # Expo React Native (Expo Router)
  packages/
    game-engine/          # pure, UI-independent rules engine (all games)
    game-contracts/       # shared types: cards, rule packs, actions, envelopes
    shared-ui/            # design-system components (shadcn/Tailwind + RN mirror)
    design-tokens/            # design tokens → CSS vars / Tailwind theme / RN JSON
    shared-types/         # cross-cutting TS types
    shared-utils/         # shared helpers (pure)
    localization/         # ICU messages (EN/GU/HI), keys, loaders
    test-fixtures/        # seeded decks, deterministic scenarios
  supabase/
    migrations/           # SQL migrations (source of truth for schema)
    functions/            # Edge Functions (server-authoritative actions)
    seed.sql              # local/dev seed data
  docs/                   # this Product Bible
  .github/                # workflows, PR templates, CODEOWNERS
  README.md · LICENSE · CONTRIBUTING.md · CODE_OF_CONDUCT.md · SECURITY.md
```

> The provided v1 spec used `apps/{web,mobile}` + `packages/{game-engine,
game-contracts,design-tokens,localization,test-fixtures}`. This Bible keeps those and
> adds `shared-ui`, `shared-types`, `shared-utils` so the design system and shared
> code have clear homes. The exact final package boundaries are confirmed in the
> [developer handbook](../06-developer-handbook/folder-structure.md).

## Dependency direction (clean architecture)

```
apps/web ─┐
apps/mobile ─┼─► shared-ui ─► design-tokens
            │        └────────► game-contracts ◄─── game-engine
            └─► localization        ▲
                                    │
                supabase/functions ─┘   (engine runs server-side for authority)
```

- **Engine depends only on `game-contracts`** (+ pure utils). No UI, no network, no
  Supabase imports. This is what makes it testable and reusable.
- **Apps depend on shared packages**, never the reverse.
- **Edge Functions import the same engine** so client and server share one rule set —
  but only the server's result is authoritative.

## Runtime data flow (a turn, end to end)

1. UI renders from the **public snapshot** + the player's **own private hand**.
2. Player taps a card → client sends a **`DRAW_CARD` action envelope** (JWT, gameId,
   expectedVersion, clientActionId, opaque positionToken) to an **Edge Function**.
3. Edge Function verifies membership + rate limits, opens a DB transaction, **locks
   the game row**, runs the **engine** to validate + apply, writes the new public
   snapshot + private states + event log, bumps `state_version`.
4. DB **broadcasts a lightweight version-change** event on the private game channel.
5. Each client **fetches the new public snapshot**; each player can fetch **only its
   own** private hand (enforced by RLS).
6. UI animates **after** the authoritative response (no optimistic hidden-card reveal).

Full detail: [multiplayer authority](./multiplayer-authority.md).

## Why this shape

- **Correctness & anti-cheat:** truth lives server-side; clients can't see or forge
  hidden state ([security](./security-and-privacy.md)).
- **Reuse:** one engine for every game and platform ([game-engine](./game-engine.md)).
- **Scalability:** stateless Edge Functions + Postgres transactions + Realtime
  fan-out scale horizontally; game state is small and row-locked per game.
- **Portability:** shared TS + tokens means new platforms/games are additive.
