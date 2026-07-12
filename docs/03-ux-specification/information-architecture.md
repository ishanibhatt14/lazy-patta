# Information Architecture

The map of the product. Keep it shallow and obvious — a grandparent should never be
more than a couple of taps from playing.

## Top-level structure

```
Lazy Patta
├── Splash
├── Language selection
├── Welcome
├── Authentication
│   ├── Sign-in options (Apple / Google / Email code)
│   ├── Email entry → OTP verification
│   └── Play as guest (computer only)
├── Profile setup            (display name · avatar · language · sound)
├── Home                     (hub)
│   ├── Continue playing      (resume/active rooms)
│   ├── Games (collection)
│   │   ├── Gadha Chor
│   │   ├── Lal Satti         (coming soon)
│   │   └── Judgement         (coming soon)
│   └── Play modes
│       ├── Play Computer
│       ├── Create Private Room
│       └── Join Room
├── Lobby                    (host / guest)
├── Game Table               (my turn / opponent turn / draw / pair / disconnected / reconnecting)
├── Result                   (winner / Gadha Chor) → Rematch
├── Profile & Stats
├── Settings
│   ├── Language
│   ├── Sound & haptics
│   ├── Theme (Classic Cream / Night Table / festival)
│   ├── Accessibility (senior mode, reduced motion, colorblind)
│   ├── Notifications
│   └── Account (sign out · delete account)
├── Social                   (MVP-light)
│   ├── Family groups / friends (private scope)
│   └── Report / block
├── Help & Rules             (how to play)
└── Legal & Support          (privacy · terms · support · delete-account web page)
```

## Navigation model

- **Primary nav (mobile):** bottom `TabBar` — **Home · Games · Profile**. Settings
  reached from Profile. The game table and lobby are **full-screen, focused** modes
  (no tab bar) to keep attention on play.
- **Primary nav (desktop):** left `NavRail`; game table centered in a 16:10 play
  area with an optional right panel for room info + reactions.
- **Depth rule:** Home → (mode) → play in **≤ 3 taps** for guests; live rooms add
  auth once.

## Gating (auth requirements)

Per [decisions D-21](../00-product-bible/decisions-log.md):

| Area                        | Guest | Requires login |
| --------------------------- | ----- | -------------- |
| Play vs computer            | ✅    | —              |
| How-to-play, rules, legal   | ✅    | —              |
| Create/Join private room    | —     | ✅             |
| Profile, stats, history     | —     | ✅             |
| Family groups, report/block | —     | ✅             |
| Notifications               | —     | ✅             |

Guests hitting a gated action see a friendly sign-in prompt with the rationale
("Sign in to play live with family and save your stats") — never a hard wall.

## Web routes (public surface)

Aligns to store/web requirements ([07 · launch](../07-product-strategy/launch-checklist.md)):

`/` · `/games/gadha-chor` · `/how-to-play/gadha-chor` · `/privacy` · `/terms` ·
`/support` · `/delete-account` · `/invite/[code]`

## URL & deep-link strategy

- **Invite deep links** (`/invite/[code]`) resolve to Join → (auth if needed) →
  Lobby. Must work cold (fresh install / not signed in) and restore intent post-auth.
- Deep links + notifications route into the correct room/lobby/table state, then
  fall back to Home if the room is gone.
