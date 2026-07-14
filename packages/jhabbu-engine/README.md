# @lazy-patta/jhabbu-engine

Pure deterministic Jhabbu / Bhabho / Bhabhi rules engine for Lazy Patta.

This package owns only game-state transitions and bot decisions. It does not
import UI, auth, network, persistence, timers, or random globals. Shuffling is
driven by an injected `Rng`.
