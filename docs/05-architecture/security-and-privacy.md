# Security, Anti-Cheat & Privacy

Family trust is the brand. Security here protects three things: **fair play**
(anti-cheat), **private information** (hands, personal data), and **safety** (a
kid-and-grandparent audience).

## Anti-cheat (fair play)

- **Server-side shuffle and deal** with cryptographic RNG; clients never shuffle or
  hold the full deck ([game-engine](./game-engine.md)).
- **Never send opponent card identities to clients** — the UI knows counts and
  positions only ([game-table contract](../03-ux-specification/game-table-contract.md)).
- **Signed, short-lived position tokens** for selectable opponent cards; they expire
  on `state_version` change so they can't be replayed.
- **Server-authoritative validation** of every action (turn, legality, version) —
  clients can't forge outcomes ([multiplayer authority](./multiplayer-authority.md)).
- **Idempotent actions** via unique `(game_id, actor_id, client_action_id)` — retries
  can't double-apply.
- **Bots run on the server** — never trusted from a client.

## Data protection (privacy)

- **RLS on every user-accessible table**; players read only their own private state.
- **Private Realtime channels** authorized by room membership; broadcasts carry only
  a version signal, never hidden state.
- **Secrets only in server environment variables**; service-role key never ships to
  clients.
- **Rate limits** per user, IP, and room on all mutating endpoints.
- **Never log** card hands, provider tokens, or OTP values. `requestId` correlates
  logs without exposing sensitive data ([api-contracts](./api-contracts.md)).
- **Dependency and secret scanning in CI** ([deployment-and-cicd](./deployment-and-cicd.md)).

## Safety & moderation (family audience)

- **Preset reactions only** — no free text or voice in MVP
  ([decisions D-24](../00-product-bible/decisions-log.md)) — removes harassment vectors.
- **Profanity filtering** on display names.
- **Block/report** controls; blocked users can't share a room; reports feed moderation.
- **Private rooms only** — no public random matchmaking, no open social graph in MVP.
- **Audit event log** (`game_events`) without storing unnecessary personal data.

## Authentication

- **Email OTP / magic link** everywhere; **Apple** on iOS; **Google** on Android/web;
  **no passwords** ([decisions D-20](../00-product-bible/decisions-log.md)).
- If social login is used on iOS, provide an **equivalent privacy-preserving option**
  (store requirement).
- Sessions stored securely (secure storage on mobile; httpOnly where applicable on web).

## Privacy & compliance

- **Collect:** account ID, provider email, display name, avatar choice, language,
  match stats, device push token, operational logs.
- **Do not collect:** precise location, contacts, microphone, camera, or date of birth.
- **Age positioning:** general audience **13+**; **not** the Kids Category
  ([decisions D-22](../00-product-bible/decisions-log.md)).
- **No real-money gaming**, prizes, wagering, or redeemable currency — enforced at
  the product level, a hard brand + store line.

## Account deletion

- **In-app** (Settings → Account → Delete) **and** public web page
  **`/delete-account`**.
- Flow: re-authenticate → confirm → queue `account_deletion_requests`.
- **Revoke provider tokens** where applicable; **delete/anonymize** profile, push
  tokens, room memberships, and personal history per the retention policy.

## Required public materials

- Privacy policy, terms, community rules, support contact.
- App-review demo account or a complete demo mode.
- Data-safety / privacy-nutrition answers consistent with the collection list above.

## Security review gates (CI + release)

- Secret + dependency scanning on every PR.
- An automated test proving **no client can read another player's hand** via API or
  Realtime (a hard release gate — [testing strategy](../06-developer-handbook/testing-strategy.md)).
- Rate-limit and RLS policy tests.
- Recheck store privacy policies immediately before submission.
