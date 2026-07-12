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
- All sevens open the shared tableau at deal time.
- A turn may play one card adjacent to its suit's visible sequence:
  - below seven: 6, 5, 4, 3, 2
  - above seven: 8, 9, 10, jack, queen, king, ace
- Passing is legal only when the current player has no playable card.
- First player to empty their hand wins.
- Scoring is win-only for MVP; remaining-card points can be added by a future
  rule pack without changing this package's public state reducer.

The engine imports only shared card contracts and has no UI, I/O, network, time,
or persistence dependencies.
