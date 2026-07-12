# Lal Satti — Game Design Document (outline)

> **Status:** fast-follow after Gadha Chor. This is a scoped outline proving the
> [framework](./game-design-framework.md) generalizes; it will be expanded to a
> full GDD before implementation. Rules must be confirmed against the family
> variant (see [decisions-log](../00-product-bible/decisions-log.md)).

## 1. Overview & fantasy

"Lal Satti" (the red seven) is a family sequence/build game where players race to
play out their cards by building suit sequences on the table, anchored on the
sevens. Warm, quick, and easy to teach across ages — same table feel as Gadha Chor,
different core loop (build sequences vs shed pairs).

## 2. Players & materials

- **Players:** 2–6 (with bots).
- **Deck:** standard 52; deal all cards.

## 3. Rules (to confirm)

- Sevens open each suit; players extend up (8,9,10…) and down (6,5,4…) from the
  seven of each suit on a shared tableau.
- On your turn, play a legal card to the tableau or pass (per pack rules) if you
  cannot; some variants penalize/limit passing.
- First to empty their hand wins the round; scoring may weight remaining cards.

_Exact opening card (red seven vs any seven), pass rules, and scoring are
family-variant dependent and will be locked in the full GDD._

## 4. Rule-pack config (planned fields)

`openingCard` (e.g. `7♥` / any 7), `direction`, `passRule` (free / limited /
penalized), `scoring` (win-only / points-for-remaining), `turnSeconds`, player range.

## 5. Engine reuse

- Reuses shared **deck/deal/turn/validation/projection/bot** layer.
- New game-specific piece: **tableau/sequence legality** reducer + view projection
  for a **shared public tableau** (unlike Gadha Chor's private hands only). Good
  test of public-shared-state rendering.

## 6–11.

Bot (play a random legal card, humanized delay; heuristics later), scoring/stats,
tutorial, animations (card-to-tableau placement, sequence completion celebration),
accessibility (tap-only, legible tableau, three languages), and test matrix follow
the [GDD template](./game-design-framework.md#gdd-template) and will be completed
pre-build.
