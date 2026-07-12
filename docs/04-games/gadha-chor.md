# Gadha Chor — Game Design Document

> a.k.a. **Gulam Chor**. The MVP launch title. Follows the
> [GDD template](./game-design-framework.md#gdd-template).

## 1. Overview & fantasy

Gadha Chor is the Indian family classic in the "odd-one-out" family (kin to "Old
Maid"). Everyone races to shed **pairs** (_jodi_) from their hand by drawing cards
from each other. One card in the deck has no partner — whoever is stuck holding it
at the end is the **Gadha Chor** (the donkey), to warm, laughing groans around the
table. It's simple, chance-driven, and endlessly re-playable — perfect for mixed
ages and quick rounds.

**The feeling:** low-stakes, high-laughter. Nobody's out much; the "loser" is
celebrated with affection and immediately offered a rematch (see
[mascot](../01-brand/mascot.md) and [voice](../01-brand/voice-and-copywriting.md)).

## 2. Players & materials

- **Players:** 2–6 (MVP: 1 human + 1–5 bots vs computer; 2–6 in private rooms).
- **Deck:** standard 52-card deck.
- **Removal:** remove **one Jack at random** before dealing → 51 cards, leaving one
  Jack with no possible partner (the "gadha" card). _(The removed rank is
  configurable; Jack/Gulam is the default — hence "Gulam Chor.")_

## 3. Rules (default pack `classic-gulam-chor`)

**Setup**

1. Server shuffles the 52-card deck (crypto RNG in prod, seeded in tests).
2. Server removes **one Jack at random** (unseen).
3. Deal all **51** remaining cards as evenly as possible (some players may have one
   extra — that's fine).
4. **Auto-remove initial pairs:** every player automatically discards all same-rank
   pairs from their hand (suit-agnostic; e.g. 7♣+7♥). Players _see_ this happen
   (animation) so the game visibly becomes fair.

**Turn (repeat clockwise from a starting player)**

5. The **active player draws one hidden card** from the **next active player
   clockwise** (the client sends an opaque `positionToken`, never a card identity).
6. If the drawn card **forms a pair** with a card in the active player's hand, that
   pair is **removed immediately** (animation + "Jodi mali gai!").
7. A player who reaches **zero cards** is **finished** (safe) and is skipped from
   then on.
8. Play continues until only the odd Jack remains.

**End / result**

9. The **last player holding the unmatched Jack** is the **Gadha Chor** and loses
   the round. Everyone else is safe; the framing is gentle and funny, never harsh.
10. Server computes and broadcasts the result; **Rematch** is offered immediately.

**Edge cases**

- Two players left, one holding only the odd Jack → the other draws; if it pairs
  they finish and the Jack-holder is Gadha Chor.
- A player finishing on the same turn they're drawn from → skip cleanly on next rotation.
- Turn timeout (only if `turnSeconds` set) → optional auto-draw of a random legal
  position (room setting; see [reconnect/failure](../05-architecture/)).

## 4. Rule-pack config

Default = `classic-gulam-chor`. All fields validated server-side.

| Field | Type | Default | Range / options | Notes |
|-------|------|---------|-----------------|-------|
| `minPlayers` | int | 2 | 2 | — |
| `maxPlayers` | int | 6 | 2–6 | table + layout limit |
| `removedRank` | Rank | `J` | any rank | which rank becomes the "gadha" (Gulam=Jack) |
| `removedCount` | int | 1 | 1 | ensures exactly one unpairable card |
| `pairing` | enum | `same-rank` | `same-rank` \| (future: `same-rank-color`) | pair definition |
| `autoRemovePairs` | bool | `true` | true/false | auto-discard on deal + on draw |
| `direction` | enum | `clockwise` | `clockwise` \| `counterclockwise` | draw/turn direction |
| `turnSeconds` | int\|null | `null` | null or 10–60 | untimed by default (family-friendly) |
| `drawSource` | enum | `next-active` | `next-active` \| (future: `any-active`) | who you draw from |

**Named variants** (families pick one): `classic-gulam-chor` (default),
`quick-4` (4 players, `turnSeconds: 20`), plus custom via room settings. Variants
are versioned so saved matches stay reproducible.

## 5. State machine

Reuses the shared engine states (see [game-state](../05-architecture/)):

- **Game:** `LOBBY → DEALING → REMOVING_INITIAL_PAIRS → IN_PROGRESS →
  (PAUSED_RECONNECT) → COMPLETED | ABANDONED`.
- **Player:** `INVITED → JOINED → READY → ACTIVE → FINISHED` (`DISCONNECTED`/`LEFT`
  as needed).
- **Events:** `GAME_STARTED, CARDS_DEALT, PAIR_REMOVED, CARD_DRAWN, TURN_ADVANCED,
  PLAYER_FINISHED, GAME_COMPLETED, REMATCH_REQUESTED` (+ connection events).

## 6. Bot behavior

MVP is intentionally simple — the game is chance-driven
([decisions D-13](../00-product-bible/decisions-log.md)):

- On its turn, the bot **randomly selects a valid server-issued position token** to
  draw from the next active player.
- **Humanized pacing:** delay **500–1200ms** before acting so it feels like a person.
- Bot actions execute **on the server** (never trusted from a client).
- **Seeded RNG in tests; crypto RNG in production.**

**Difficulty roadmap (post-MVP):** add light card-counting/memory (track which ranks
have been seen leave hands) and simple heuristics (avoid becoming the sole Jack
holder when a choice exists). The base game stays mostly luck, by design — that's
what makes it fair across ages. A future **AI coach** could explain moves in the
tutorial ([roadmap](../07-product-strategy/roadmap.md)).

## 7. Scoring & stats

Never currency. Tracked per profile (see [analytics](../07-product-strategy/analytics-and-kpis.md)):

- Games played / completed, wins (didn't end as Gadha Chor), times as Gadha Chor
  (worn as a fun badge, not shame), pairs found, family nights (rooms with family),
  fastest hand-clear, longest rematch streak.
- Stats are **private / family-scoped** in MVP — no public leaderboards
  ([decisions](../00-product-bible/decisions-log.md)).

## 8. Tutorial / how-to-play

- **How to play** static screen (illustrated, 5 steps) reachable from game details
  and settings.
- **First-run coached game** vs a single bot: Gaddo points out "draw a card,"
  "you found a pair!", and "don't get stuck with the donkey card." Skippable.
- Copy is warm and localized (EN/GU/HI). Emits `tutorial_completed`.

## 9. Animations & sound

All hooks defined in [motion](../02-design-system/motion-and-animation.md) and
[sound](../01-brand/sound-design.md):

- Shuffle → Deal (staggered) → visible initial pair removal.
- Turn pulse on active seat + `TurnBanner` ("Tamaro varo!").
- Draw: opponent backs lift + teal glow; tap → 400ms slide; **face revealed only to
  the drawer, after server confirms**.
- Pair found: cards fly to center, flip, **dissolve into Bandhani dots** + warm
  chime + success haptic.
- Result: winner flourish / gentle **Gadha Chor** mascot reveal → Rematch.
- All have reduced-motion fallbacks; all sounds have captions and are mutable.

## 10. Accessibility notes

- Draw is **tap-only** (no drag). Eligible cards indicated by lift + icon +
  position, not color alone.
- Screen reader: "Draw a card from {name}. {n} cards remaining." Own cards labeled
  by rank/suit; **opponent cards by count/position only** (anti-cheat).
- Turn changes + results announced via live regions. Large cards; senior mode; three
  languages. Full list in [accessibility](../02-design-system/accessibility.md).

## 11. Test matrix

Aligned to the [testing strategy](../06-developer-handbook/testing-strategy.md):

**Unit**

- Deck composition after removing one Jack (51 cards, exactly one unpairable Jack).
- Shuffle invariants (no dup IDs, all cards present, distribution).
- Deal distribution for 2–6 players.
- Pair detection/removal (initial + on-draw), suit-agnostic.
- Turn advance + skipping finished players.
- End-game detection + correct Gadha Chor identification.
- Rule-pack variants (removedRank, direction, turnSeconds, player counts).

**Property-based**

- Card-count conservation across every action.
- No duplicate card IDs ever.
- Exactly **one** unmatched removed-rank card remains at game end.
- `state_version` increments **exactly once** per accepted action.

**Integration**

- Create/join/start room; server-authoritative draw; idempotent retry (same
  `clientActionId` → one effect); concurrent-action version conflict handling.
- Disconnect/reconnect mid-turn without card leakage; bot replacement after grace.

**End-to-end**

- 2-, 4-, and 6-player full matches (web Playwright; mobile Maestro/Detox).
- Slow network / airplane-mode interruption / app restart → safe resume.
- Gujarati & Hindi layout (overflow) and screen-reader / reduced-motion flows.
- **No client can read another player's hand** via API or Realtime (security gate).
