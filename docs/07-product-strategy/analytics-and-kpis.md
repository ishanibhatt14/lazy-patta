# Analytics & KPIs

Measure what tells us families are **playing, returning, and feeling it** — while
respecting privacy. **Never log** card hands, provider tokens, or OTP values.

## North-star metric

**Weekly returning family play** — the count of distinct family groups (or
guest+bot players) who complete a game and come back within 7 days. It captures the
core promise: recurring, cross-generation play. Everything below ladders up to it.

## KPI tree

| Layer | Metric | Why |
|-------|--------|-----|
| **Activation** | guest completes first match vs computer | the "aha" |
| | tutorial completion rate | teaching works |
| **Conversion** | guest → signed-in (when they want live rooms) | intent, not force |
| | invite link → joined room rate | the diaspora loop works |
| **Engagement** | matches per active user / week | habit |
| | rematch rate | fun + group cohesion |
| | live rooms per week; players per room | the social core |
| **Retention** | D1 / D7 / D30; weekly returning family play (NSM) | do they come back |
| **Quality** | reconnect success rate | trust on flaky networks |
| | state-version conflict rate; action latency p50/p95 | correctness + speed |
| | crash-free sessions | polish |

## Product events (client → analytics)

`onboarding_started/completed` · `guest_game_started/completed` ·
`sign_in_started/completed/failed` · `room_created/joined/start_failed` ·
`game_started/completed/abandoned` · `reconnect_started/succeeded/failed` ·
`rematch_requested/accepted` · `language_changed` · `tutorial_completed`.

Each event carries minimal, non-PII context (game id, rule pack id, player count,
locale) — never hands or identities beyond an opaque user/session id.

## Operational metrics (server/infra)

- action latency **p50/p95**
- reconnect success rate
- room-join failure rate
- **state-version conflict rate**
- crash-free sessions
- Edge Function error rate
- Realtime disconnects

Alerting thresholds live in [deployment-and-cicd](../05-architecture/deployment-and-cicd.md).

## Privacy rules (hard)

- **Privacy-conscious analytics** only; minimize collection
  ([security-and-privacy](../05-architecture/security-and-privacy.md)).
- **Never** send/store card hands, provider tokens, or OTP.
- No precise location, contacts, mic, camera, or DOB.
- Respect account deletion — analytics identifiers are removed/anonymized with the account.

## How KPIs gate decisions

- **Monetization** experiments (Q2+) may not degrade retention or activation
  ([monetization](./monetization.md)).
- **Milestone gates** (roadmap) reference activation + reconnect + hand-secrecy signals.
- **Launch** requires healthy activation and crash-free rates in internal testing
  ([launch-checklist](./launch-checklist.md)).
