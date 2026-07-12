# Target Audience

## Primary

1. **Gujarati and Indian families** in India, the US, Canada, and the UK.
2. **Adult children playing remotely** with parents and grandparents.
3. **Families teaching traditional card games** to the next generation.

## Secondary

4. **Casual players** who want quick, low-pressure card games with a warm identity.

## Personas

### 1. Riya — the diaspora connector (primary buyer & evangelist)

- 29, software designer in Toronto; grew up in Ahmedabad.
- Misses Diwali card sessions with her nani. Video calls feel one-directional.
- **Job:** "Help me actually _do_ something joyful with my family back home, not
  just talk at them."
- **Needs:** dead-simple invite (share a code/link), works on her mom's old phone,
  reconnects gracefully on flaky Indian mobile networks.
- **Wins when:** she hosts a room and three generations laugh at the same donkey reveal.

### 2. Kanti-dada — the grandparent (must-not-lose user)

- 71, in Rajkot. Comfortable on WhatsApp, nothing more complex.
- **Job:** "Let me play with my grandkids without feeling stupid or needing help."
- **Needs:** large cards, large touch targets, Gujarati UI, no drag gestures, no
  jargon, obvious "it's your turn," forgiving reconnection.
- **Wins when:** he joins from a shared link and never has to ask "what do I press?"

### 3. Meera — the parent & family organizer

- 41, in London. Wants her kids to know the games she grew up with.
- **Job:** "Give my kids a screen thing I actually feel good about."
- **Needs:** provably safe (no chat, no gambling, no ads targeting kids), teaches
  the rules, quick enough for a school night.
- **Wins when:** her 9-year-old teaches _her_ a rule variant back.

### 4. Arjun — the casual returner

- 24, in Bangalore. Plays mobile games in transit.
- **Job:** "A quick, low-stakes game with personality while I wait."
- **Needs:** instant guest play vs bots, fast matches, something that doesn't feel
  like the 400th rummy clone.
- **Wins when:** the warmth and humor make him screenshot it for the family group.

## Jobs to be done

| When…                                     | I want to…                              | So I can…                        |
| ----------------------------------------- | --------------------------------------- | -------------------------------- |
| I'm far from family on a festival         | play the game we always played          | feel close despite the distance  |
| my parent is bored/alone                  | start a game in seconds and invite them | share a light, recurring ritual  |
| my kids ask "what did you play as a kid?" | show and play it with them              | pass the tradition on            |
| I have 5 idle minutes                     | play a quick round vs the computer      | relax without commitment or risk |

## Contexts of play (design for these)

- **Cross-device, cross-generation, cross-timezone** live rooms — the signature use case.
- **Old / low-end Android phones** and **spotty mobile data** (reconnect is a
  first-class feature, not an edge case — see [architecture/reconnect](../05-architecture/)).
- **One-handed, on the go** — tapping over dragging; portrait-first.
- **Shared living-room screens** — cards legible from arm's length.

## Accessibility & inclusion requirements (audience-driven)

Because grandparents and kids are core, not edge, these are **requirements**, not nice-to-haves:

- Large cards & 48×48 minimum touch targets.
- English / Gujarati / Hindi from day one, with correct glyph coverage.
- Turn state conveyed by **text + icon + position**, never color alone.
- Screen-reader labels for every card and action; keyboard-operable web.
- Reduced-motion and mute toggles; dynamic type up to 200% without clipping.

Full criteria: [02 · Accessibility](../02-design-system/accessibility.md).

## Anti-audience (who we deliberately don't chase)

- Real-money / gambling players. Wrong product, wrong values, store risk.
- Hardcore competitive card gamers wanting ranked ladders and leagues.
- Anyone seeking open social/chat networking — we are private-family by design.
