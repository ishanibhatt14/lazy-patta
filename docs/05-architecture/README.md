# 05 · Architecture

How Lazy Patta is engineered: a **server-authoritative**, **UI-independent-engine**,
**monorepo** system that runs the same TypeScript across web, iOS, and Android.

| Doc | Purpose |
|-----|---------|
| [System Architecture](./system-architecture.md) | The big picture, monorepo layout, data flow |
| [Game Engine](./game-engine.md) | The pure, UI-independent rules engine |
| [Multiplayer Authority](./multiplayer-authority.md) | Server-authoritative action path, versioning, idempotency |
| [Database Schema](./database-schema.md) | Postgres tables, constraints, RLS |
| [API Contracts](./api-contracts.md) | Edge Functions, envelopes, TypeScript contracts |
| [Security & Privacy](./security-and-privacy.md) | Anti-cheat, RLS, moderation, data protection |
| [Deployment & CI/CD](./deployment-and-cicd.md) | Vercel, Supabase, EAS, GitHub Actions |

## Guiding principles

1. **Server is the single source of truth.** Clients render state and request
   actions; they never decide shuffles, card identity, turn validity, or results.
2. **Engine is pure and UI-independent.** `(state, action) → state'`, deterministic,
   fully testable, shared across all platforms and all games.
3. **Least privilege by default.** RLS on every user-accessible table; private hands
   are unreadable by other players via API _or_ Realtime.
4. **One codebase, three platforms.** Shared TypeScript packages; thin platform shells.
5. **Idempotent & versioned.** Every action is idempotent and advances a monotonic
   `state_version`.
