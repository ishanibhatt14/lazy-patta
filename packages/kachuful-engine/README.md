# @lazy-patta/kachuful-engine

Deterministic engine for **Kachuful** (also known as **Judgement**, **Kachufool**,
or **Kachooful**) — an exact-trick-prediction trick-taking game.

- Pure and deterministic: all randomness is injected via an `Rng` at `init` time.
  The whole match is dealt up front, so `reduce` never needs randomness and stays
  a pure `(state, action) -> { state, events }` function (ADR-0003).
- 3–7 players, standard 52-card deck.
- Trump rotates each round: spades → diamonds → clubs → hearts → no-trump.
- Hand size counts **down** from 7 to 1 (7 rounds), so the deck always fits.
- Sequential bidding with the **hook rule**: the dealer bids last and may not
  choose a bid that makes the table's total equal the number of tricks — someone
  must be wrong.
- Exact-bid scoring: hit your bid for `10 + bid`, miss for `0`.

The engine mirrors the conventions of `@lazy-patta/jhabbu-engine`: readonly
discriminated `KachufulAction` / `KachufulEvent` unions, a monotonic
`stateVersion`, and card-conservation invariants asserted on every transition.
