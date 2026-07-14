# Lazy Patta — Jhabbu Product, UX and Technical Specification

**Version:** 1.0  
**Date:** July 14, 2026  
**Working title:** Jhabbu  
**Also known as:** Bhabho, Bhabhi, Laad, Get Away  
**Repository:** `ishanibhatt14/lazy-patta`

## 1. Product decision

Add **Jhabbu** as the third Lazy Patta game after Gadha Chor and Lal Satti.

| Game       | Core emotion                 | Main mechanic                              |
| ---------- | ---------------------------- | ------------------------------------------ |
| Gadha Chor | Suspense and laughter        | Hidden-card drawing and pair removal       |
| Lal Satti  | Strategy and sequencing      | Building suit runs from sevens             |
| Jhabbu     | Pressure and pile punishment | Follow suit, trigger Thulla, force pickups |

Launch first as **Jhabbu — Gujarati Family Rules**, with **Classic Bhabho** as a later rule preset.

## 2. Naming and SEO

**Primary name:** Jhabbu  
**Aliases:** Jhabbo, Zabbu, Bhabho, Bhabhi, Bhabhi Thulla, Laad, Get Away, Getaway  
**Gujarati:** ઝબ્બુ, ઝબ્બો, ભાભો, થુલ્લા  
**Hindi:** झब्बू, भाभो, भाभी, थुल्ला

**SEO title:** Play Jhabbu Online — Bhabho, Bhabhi & Get Away Card Game

**Canonical routes:**

```text
/en/games/jhabbu
/gu/games/jhabbu
/hi/games/jhabbu
```

Alias URLs such as `/games/bhabho`, `/games/bhabhi`, `/games/laad`, and `/games/get-away` should redirect to the canonical Jhabbu page.

## 3. Source-backed classic rules

### Players and deck

- 3–6 players for the Lazy Patta MVP.
- Standard 52-card deck.
- Deal all cards one at a time; some players may receive one extra card.
- Card order: A, K, Q, J, 10 … 2.

### Opening trick

- The Ace of Spades holder starts and must lead A♠.
- Players with Spades must follow Spades; others may play any card.
- The entire first trick is discarded to the waste pile.
- The A♠ holder leads again.

### Later tricks

- The player with **the power** leads any card.
- Players must follow the led suit if possible.
- If everyone follows suit, the highest card of the led suit wins; the trick is discarded; that player gains the power and leads next.
- If someone cannot follow suit, they may play any card. That off-suit card is a **Thulla / Tochoo**.
- The first Thulla ends the trick immediately; later players do not play.
- The highest card of the led suit picks up the entire trick and gains the power.

### Getting away

- A player who empties their hand safely exits the round.
- A player cannot get away while still holding the power. If they empty their hand but must lead, they draw from the waste pile and continue.
- The last remaining player with cards loses and becomes Jhabbu/Bhabho.

### Scoring

Recommended MVP scoring:

- First player out: 0 penalty points.
- Second player out: 1 point.
- Middle players: 2 points.
- Last player: 3 points.
- Match ends at 6 penalty points or a configured round count.
- Lowest total score wins.

## 4. Versioned rule pack

```ts
export interface JhabbuRulePack {
  id: 'gujarati-family-v1' | 'classic-bhabho-v1';
  minPlayers: number;
  maxPlayers: number;
  aceOfSpadesStarts: boolean;
  firstTrickAlwaysDiscarded: boolean;
  thullaEndsTrickImmediately: boolean;
  pickupRule: 'highest-led-suit' | 'off-suit-player';
  powerPlayerMustDrawIfEmpty: boolean;
  allowTakeLeftPlayersHand: boolean;
  twoPlayerShootout: boolean;
  scoring: 'finish-order-0-1-2-3' | 'rounds-only';
  matchEnd: {
    type: 'penalty-limit' | 'round-count';
    value: number;
  };
}
```

Recommended default:

```ts
{
  id: 'gujarati-family-v1',
  minPlayers: 3,
  maxPlayers: 6,
  aceOfSpadesStarts: true,
  firstTrickAlwaysDiscarded: true,
  thullaEndsTrickImmediately: true,
  pickupRule: 'highest-led-suit',
  powerPlayerMustDrawIfEmpty: true,
  allowTakeLeftPlayersHand: false,
  twoPlayerShootout: true,
  scoring: 'finish-order-0-1-2-3',
  matchEnd: { type: 'penalty-limit', value: 6 }
}
```

## 5. UX vision

### Theme

**Gujarati Monsoon Veranda**

- Warm veranda during light rain.
- Peacock-green woven playing mat.
- Lantern light, wood/cane furniture, subtle Gujarati textile geometry.
- Family avatars around the table.
- Central trick pile.
- No casino felt, chips, coins, jackpots, or betting language.

### Emotional tone

Fast, dramatic, playful, affectionate, and easy for elders and beginners.

## 6. Primary screen layout

### Mobile portrait

```text
┌────────────────────────────┐
│ ← Jhabbu        Round 1  ⋯ │
│                            │
│          👵 Ba · 9         │
│                            │
│  👨 Kaka              👩 Krina
│   6 cards              8 cards
│                            │
│        HEARTS LED          │
│                            │
│       [6♥] [Q♥] [3♣]       │
│              THULLA!       │
│                            │
│ Kaka picks up 3 cards      │
│                            │
│ YOUR HAND                  │
│ [2♠][5♥][9♥][J♣][A♦]      │
│                            │
│ Your turn · Play a Heart   │
└────────────────────────────┘
```

### Desktop/tablet

- Opponents around the table rim.
- Trick pile in the center.
- Power badge near the current leader.
- Human hand along the bottom.
- Scoreboard and settings in drawers, not a permanent sidebar.

## 7. Core UX states

### Must follow suit

- Legal suit cards lift and receive a haldi outline.
- Other suits remain visible but inactive.
- Instruction: **Play a Heart**.
- Invalid tap explains: **You must follow Hearts while you still have one.**

### No matching suit

- All cards become selectable.
- Instruction: **You have no Hearts. Play any card to make a Thulla.**

### Thulla event

1. Off-suit card lands sideways.
2. “THULLA!” appears.
3. Remaining players are skipped.
4. Highest led-suit card glows.
5. Trick pile slides toward that player.
6. Their card count increases.
7. Power transfers to them.
8. They lead next.

### Normal trick

- Highest led-suit card glows.
- Trick compresses into the waste pile.
- Power transfers to the winner.

### Player gets away

- Final card leaves hand.
- Avatar glows with **Got away!**.
- Seat changes to a safe/finished state.

### Last player

- Remaining cards fan out.
- Show **Today’s Jhabbu** with affectionate, non-humiliating presentation.

## 8. Shared Lazy Patta components

Reuse:

- top bar
- player pods
- active-turn ring
- family avatars
- settings sheet
- language selector
- reduced motion
- high-contrast cards
- large-card mode
- sound and haptics
- score drawer
- result sharing
- private-room and reconnect infrastructure
- responsive hand layout

Jhabbu-specific components:

```text
JhabbuGameShell
JhabbuTopBar
PowerBadge
LedSuitBanner
CurrentTrick
TrickCard
ThullaCard
PickupAnimationLayer
PlayerHandFan
FollowSuitHint
NoSuitHint
ExitOrderTracker
ScoreDrawer
RoundResultOverlay
MatchResultOverlay
FirstTurnCoach
```

## 9. Game-state model

```ts
export type JhabbuPhase =
  | 'SETUP'
  | 'FIRST_TRICK'
  | 'IN_PROGRESS'
  | 'THULLA_RESOLUTION'
  | 'TRICK_RESOLUTION'
  | 'ROUND_COMPLETE'
  | 'MATCH_COMPLETE';

export interface JhabbuPlayerState {
  id: string;
  seat: number;
  hand: readonly Card[];
  status: 'ACTIVE' | 'GOT_AWAY' | 'DISCONNECTED';
  finishPosition?: number;
  penaltyPoints: number;
}

export interface JhabbuTrickCard {
  playerId: string;
  card: Card;
  sequence: number;
  isThulla: boolean;
}

export interface JhabbuGameState {
  id: string;
  phase: JhabbuPhase;
  players: readonly JhabbuPlayerState[];
  activePlayerId: string;
  powerPlayerId: string;
  ledSuit: Suit | null;
  currentTrick: readonly JhabbuTrickCard[];
  wastePile: readonly Card[];
  finishOrder: readonly string[];
  roundNumber: number;
  rules: JhabbuRulePack;
  version: number;
}
```

## 10. Actions

```ts
export type JhabbuAction =
  | {
      type: 'PLAY_CARD';
      actorId: string;
      cardId: string;
      expectedVersion: number;
      clientActionId: string;
    }
  | {
      type: 'DRAW_FROM_WASTE';
      actorId: string;
      expectedVersion: number;
      clientActionId: string;
    }
  | {
      type: 'START_NEXT_ROUND';
      actorId: string;
      expectedVersion: number;
      clientActionId: string;
    }
  | {
      type: 'REMATCH';
      actorId: string;
      expectedVersion: number;
      clientActionId: string;
    };
```

## 11. Legal move validation

- Only the active player may act.
- Card must belong to that player.
- If the player has the led suit, only that suit is legal.
- If the player is void in the led suit, any card is legal.
- A♠ is the only legal opening card.
- Finished players cannot act.
- Stale state versions are rejected.

## 12. Resolution rules

### Normal trick

```text
everyone follows
→ highest led-suit card wins
→ trick moves to waste
→ winner gains power
→ next trick begins
```

### Thulla trick

```text
first off-suit card appears
→ stop trick immediately
→ highest led-suit player picks up all trick cards
→ that player gains power
→ next trick begins
```

### Empty power player

```text
player has no cards and still has power
→ shuffle waste pile
→ draw one card
→ player leads it
```

### Getting away

```text
hand becomes empty and player does not have power
→ mark GOT_AWAY
→ add to finish order
→ remove from turn rotation
```

## 13. Bot design

No LLM is needed.

- Must follow suit.
- Prefer lower cards early.
- Preserve high cards when practical.
- When void, discard a low off-suit card by default.
- When leading, prefer low cards from long suits.
- Seed all choices for deterministic tests.

Suggested personalities:

- Ba — careful
- Kaka — aggressive
- Krina — balanced
- Dada — conservative

## 14. Tutorial

Use a playable tutorial under 60 seconds:

1. **Follow the suit that was led.**
2. **You have no Clubs. Any card can become a Thulla.**
3. **Thulla ends the trick; the highest Club picks up the pile.**
4. **Empty your hand and get away before everyone else.**

Must support EN/GU/HI and reduced motion.

## 15. Sound and haptics

Sounds:

- deal
- card tap
- normal play
- Thulla slap
- pile pickup
- power transfer
- player gets away
- round reveal
- match win

Haptics:

- light: select
- medium: valid play
- warning: Thulla
- heavy: pickup
- success: get away

All optional.

## 16. Accessibility

- 48px minimum targets.
- Keyboard play.
- Screen-reader card labels.
- Led suit announced.
- Thulla communicated by text, not animation alone.
- No color-only legal-state communication.
- High-contrast cards.
- Reduced motion.
- Large-card mode.
- No horizontal hand scrolling.
- Gujarati/Hindi overflow testing.
- Optional spoken turn prompts.

### Ba Mode

- Larger ranks/suits.
- Simpler instructions.
- Slower transitions.
- Spoken turn changes.
- Confirm before leaving.

## 17. Results

### Round result

```text
ROUND 1

Safe first
🏆 Ba

Second out
Krina

Third out
You

Today’s Jhabbu
🫏 Kaka

Penalty points
Ba       0
Krina    1
You      2
Kaka     3
```

### Match result

```text
JHABBU CHAMPION

🏆 Ba
Lowest penalty score: 3

Most Thullas       Kaka
Fewest pickups     Krina
Fastest escape     You

[ Play Again ]
[ Share Result ]
[ Return Home ]
```

## 18. Online multiplayer

The server must control:

- shuffle
- deal
- legal moves
- trick and Thulla resolution
- pickup ownership
- power
- waste draw
- exit status
- scoring
- winner/loser

Clients must never decide those outcomes.

Reconnect requirements:

- 60-second grace period.
- Preserve private hand, trick, and power state.
- Resume from the authoritative server snapshot.
- Host may replace a disconnected player with a bot.

## 19. Testing

### Unit tests

- 52-card conservation.
- Correct deal distribution.
- A♠ holder starts.
- A♠ is forced first.
- Must follow suit.
- Any card is legal when void.
- Thulla stops the trick.
- Later players are skipped.
- Highest led-suit player picks up.
- Normal trick discards.
- Power transfers correctly.
- Player gets away only without power.
- Empty power player draws from waste.
- Last player loses.
- Penalty scoring is correct.

### Property and simulation tests

- No duplicate card IDs.
- No card loss.
- Every deterministic simulation terminates.
- No finished player acts.
- Public state never leaks private hands.
- Run at least 100 games for each supported player count: 3, 4, 5, and 6.

### E2E

- Setup to result.
- First-trick tutorial.
- Normal trick.
- Thulla.
- Pickup.
- Player gets away.
- Waste draw.
- Rematch.
- Gujarati/Hindi.
- Reduced motion.
- High contrast.
- Large-card mode.
- Narrow phones.
- Online reconnect.

## 20. Responsive acceptance criteria

Test:

- 320×800
- 360×800
- 390×844
- 430×932
- 768×1024
- 1024×768
- 1440×1024

Requirements:

- full hand remains usable
- no horizontal scrollbar
- trick stays visible
- Thulla banner does not cover cards
- player pods do not overlap
- safe-area padding works
- Gujarati/Hindi copy fits

## 21. Repository structure

```text
packages/
  jhabbu-engine/
    src/
      types.ts
      rules.ts
      legal-moves.ts
      reducer.ts
      bot.ts
      scoring.ts
      simulation.ts
    tests/

apps/web/
  app/[locale]/play/jhabbu/computer/
  app/[locale]/play/jhabbu/online/
  components/jhabbu/

apps/mobile/
  app/play/jhabbu/
  components/jhabbu/
```

## 22. Delivery plan

### PR 1 — Engine

Rules, state machine, legal moves, first trick, Thulla, pickup, getting away, scoring, bots, tests, simulations.

### PR 2 — Web computer mode

Setup, tutorial, immersive table, trick pile, power badge, Thulla animation, result/rematch.

### PR 3 — Mobile computer mode

Expo route, haptics, responsive hand, settings, accessibility.

### PR 4 — Online multiplayer

Private rooms, authoritative actions, reconnect, bot replacement, rematch.

### PR 5 — Premium polish

Final art, monsoon-veranda environment, sound, avatars, share cards, store screenshots.

## 23. Definition of done

- 100+ deterministic simulations pass per player count.
- No card duplication or loss.
- First trick, Thulla, pickup, and power rules are correct.
- Getting-away and waste-draw rules work.
- Web and mobile computer games complete.
- Full hand fits on narrow phones.
- EN/GU/HI complete.
- Reduced motion and large-card mode work.
- Online game passes a two-device privacy/reconnect test.
- Result and rematch work.
- SEO pages and aliases exist.
- No casino styling.

## 24. Agent implementation brief

Build Jhabbu as the third Lazy Patta game. Use the approved `gujarati-family-v1` rules from this document. Create a pure TypeScript `@lazy-patta/jhabbu-engine`. Do not modify the Gadha Chor or Lal Satti engines. Reuse shared card core, design tokens, localization, player pods, hand layout, settings, rooms, score drawer, and sound/haptic abstractions. Build in focused PRs: engine first, then web, mobile, online, and premium art. Do not add premium art before engine simulations are green.

## 25. References

- [CardzMania Bhabhi / Bhabho rules](https://www.cardzmania.com/Bhabhi) — classic rule reference for A♠ opening, follow-suit play, off-suit Thulla behavior, and pickup flow.
