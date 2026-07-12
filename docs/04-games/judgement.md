# Judgement (Kachuful) — Game Design Document (outline)

> **Status:** fast-follow. Scoped outline; full GDD before implementation. Judgement
> introduces **trick-taking + bidding**, which unlocks a reusable **trick engine**
> for Mendicot and 3-2-5 too (see [framework](./game-design-framework.md)).

## 1. Overview & fantasy

Judgement (a.k.a. Kachuful / Kachufool / Oh Hell) is a beloved bidding trick-taking
game. Each round the hand size changes and the trump rotates; players **predict
exactly how many tricks** they'll win and score only if they hit their bid precisely.
It's the more strategic, "grown-ups stay up late" companion to Gadha Chor — same
warm table, more depth.

## 2. Players & materials

- **Players:** 3–7 typically (confirm for our layout; MVP-friendly 4).
- **Deck:** standard 52; number of cards dealt changes each round.

## 3. Rules (to confirm)

- Rounds vary hand size (e.g. down from max then back up, family-dependent).
- Trump rotates per round (spades/diamonds/clubs/hearts/no-trump cycle).
- Each player **bids** the exact tricks they'll take; a common constraint forbids
  the total bids from equaling the number of tricks (dealer "screwed").
- Play tricks (follow suit if able; trump wins; highest card of led suit otherwise).
- **Score:** hit your bid exactly → points (e.g. 10 + bid); miss → 0 (or penalty),
  per pack.

_Round progression, exact scoring, and player count are family-variant dependent._

## 4. Rule-pack config (planned fields)

`playerRange`, `roundProgression` (max, sequence), `trumpCycle`, `bidConstraint`
(hook rule on/off), `scoring` (`10+bid` / custom), `turnSeconds`.

## 5. Engine reuse & new subsystem

- Reuses shared deck/deal/turn/validation/projection/bot.
- **New shared subsystem: trick engine** — led-suit tracking, follow-suit legality,
  trump resolution, trick winner, per-round bid/score tracking. Built once here,
  reused by Mendicot (partnership) and 3-2-5. This is the framework's big payoff:
  add one trick engine, unlock a whole game category.

## 6. Bot behavior

- MVP: legal-move heuristics (follow suit; simple bid estimate from high cards/trumps;
  play to make-or-dump toward its bid). More than Gadha Chor's pure-random because
  Judgement rewards basic skill; still bounded and explainable.

## 7–11.

Scoring/stats (round scorecard UI), tutorial (bidding is the concept to teach —
Gaddo coaches "bid what you can win, exactly"), animations (bid reveal, trick sweep,
round-score tally), accessibility (bidding controls tap-friendly + SR-labeled;
scorecard legible in three languages), and full test matrix follow the
[GDD template](./game-design-framework.md#gdd-template) and will be completed
pre-build.
