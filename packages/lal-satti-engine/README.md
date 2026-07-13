# Lal Satti Engine

Pure, deterministic engine for the Lazy Patta Lal Satti MVP.

This repository does not currently contain packages named `card-core`,
`shared-types`, `shared-ui`, or `translations`. For this implementation:

- `@lazy-patta/game-contracts` is the shared card/type source.
- `@lazy-patta/localization` is the translation source used by app surfaces.
- Web and mobile keep UI in their app feature folders and call this package for
  all Lal Satti rules.

## MVP Rule Pack

- Standard 52-card deck.
- 2-6 players.
- `lal-satti-classic-seven-of-hearts` is the default classic rule pack.
- Deal all 52 cards, including every seven.
- The player holding the 7 of Hearts opens the round.
- The opening move is forced: only 7 of Hearts is legal.
- Other suits stay closed until their own seven is played.
- Once a suit is open, a turn may play one adjacent card:
  - below seven: 6, 5, 4, 3, 2, ace
  - above seven: 8, 9, 10, jack, queen, king
- Passing is legal only when the current player has no playable card.
- First player to empty their hand wins.
- A full blocked pass cycle is treated as an engine invariant error for the
  classic rule pack. The diagnostic includes player ids/counts and open suits,
  but never exposes private hands.
- Scoring is win-only for MVP; remaining-card points can be added by a future
  rule pack without changing this package's public state reducer.
- `lal-satti-all-sevens-open` is represented as a separate alternate rule pack
  for future variants and is not labeled Classic.

The engine imports only shared card contracts and has no UI, I/O, network, time,
or persistence dependencies.
