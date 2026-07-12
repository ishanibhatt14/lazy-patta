# Sound Design

Audio identity for Lazy Patta. Sound is delight, never slot-machine reinforcement.
Everything is **mutable**, **captioned**, and **optional** — the game is fully
playable silent (see [decisions D-35](../00-product-bible/decisions-log.md):
SFX first, recorded voice pack later).

## Audio principles

1. **Warm & acoustic.** Real-world textures — shuffling cards, a soft tabla tap, a
   gentle harmonium/santoor note — over synthetic UI blips.
2. **Nostalgic, not hype.** Festival warmth (a distant _dhol_, a single diya-lighting
   chime) instead of casino win-fanfares.
3. **Quiet by default.** Subtle, short cues. The table is a calm place; audio
   accents moments, it doesn't fill silence.
4. **Never a reward loop.** No escalating jackpot sounds, no coin cascades. Winning
   feels warm and human, not like a payout.
5. **Fully optional & accessible.** Master mute, per-category volume, and a **text
   caption for every meaningful cue**.

## Core cue list

| Cue                   | Trigger            | Character                                      | Notes                                            |
| --------------------- | ------------------ | ---------------------------------------------- | ------------------------------------------------ |
| **Shuffle**           | deal start         | riffle + soft swoosh                           | organic, tactile                                 |
| **Deal**              | each card dealt    | light _tick_                                   | subtle; can be one soft sweep for the whole deal |
| **Card lift/select**  | tap opponent card  | gentle _tap_                                   | pairs with the visual lift/glow                  |
| **Draw**              | card drawn         | soft slide                                     | 400ms, matches motion token                      |
| **Pair found**        | _jodi_ removed     | warm chime + tabla accent                      | the happy signature sound                        |
| **Your turn**         | turn passes to you | soft harmonium note + light haptic             | never nagging; one-shot                          |
| **Turn warning**      | timer low          | gentle tick-up                                 | calm, not alarming                               |
| **Win**               | you win the round  | warm santoor flourish + light confetti whoosh  | celebratory, human                               |
| **Gadha Chor reveal** | you lose           | comedic, affectionate "hee-haw"-adjacent sting | funny, kind, never harsh                         |
| **Reaction sent**     | preset reaction    | tiny pop                                       | matches emoji personality                        |
| **Reconnect**         | rejoined           | soft resolve chime                             | reassuring                                       |
| **Error**             | action failed      | low, soft "nope"                               | never harsh/buzzer                               |

## Music

- **Optional, off by default in-match** so table talk (on a family video call
  alongside) isn't buried.
- A short, warm **lobby/menu loop** — light folk instrumentation (harmonium,
  santoor, soft percussion) — is welcome; keep it loopable and unobtrusive.
- **Festival themes** may swap in seasonal beds (e.g. a Diwali motif) via the same
  theming system — token/asset swap, no code change.

## Voice pack (later — D-35)

Post-MVP delight: an optional **recorded Gujarati voice pack** for key moments
("Tamaro varo!", "Jodi mali gai!", "Shabash!", the Gadha Chor reveal). Design so
it slots in as an alternate audio set per locale without touching gameplay.

## Haptics (pair with, don't replace, audio)

Subtle haptics reinforce touch and key beats (mobile):

| Event            | Haptic                      |
| ---------------- | --------------------------- |
| Card select      | light impact                |
| Draw confirmed   | light impact                |
| Pair found       | success notification        |
| Your turn begins | light impact                |
| Win              | success notification        |
| Error / invalid  | warning notification (soft) |

Respect the OS "reduce/disable haptics" setting and provide an in-app toggle.

## Accessibility & implementation

- **Master mute + per-category volume** (SFX / music / voice) in settings.
- **Captions/text equivalents** for every essential cue — audio never carries
  information that isn't also visible.
- Preload/cache short cues for low-latency response on low-end devices.
- Keep total audio payload small; lazy-load music and the voice pack.
- Never log or transmit audio; audio is entirely client-side.
