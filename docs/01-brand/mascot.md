# Mascot — Gaddo the Donkey

> Working name: **Gaddo** (Gujarati for donkey). Final name pending brand sign-off.

The mascot is our humor engine and our differentiator. In Gadha Chor the loser
becomes the "gadha" (donkey) — so a donkey is the natural, affectionate face of
the brand. Gaddo replaces the flashy reward animations a casino app would use.

## Character brief

- **Who:** a soft, huggable little donkey — big kind eyes, slightly floppy ears,
  a bindi-dot or folk saddle-cloth motif tying him to Bandhani/Ajrakh texture.
- **Personality:** good-natured, a bit clumsy, always in on the joke. He _loses_
  cheerfully. He is never a bully and is never bullied — the humor is warm.
- **Role:** host and comic relief. He celebrates your pairs, commiserates on the
  Gadha Chor reveal, waves in empty states, and teaches in the tutorial.

## Why a donkey works (and how to keep it kind)

The Gadha Chor reveal is the app's signature comedic beat. The rule to protect:
**laugh _with_ the loser, never _at_ them.** Copy is gentle ("Aa vaar tame Gadha
Chor! 🫏 Ramat phari?" / "You're the Gadha Chor this round! Rematch?"), the
animation is cute not humiliating, and the loser is invited straight into a
rematch. Kids and grandparents both need to feel safe being the donkey.

## Expression set (minimum viable mascot kit)

Design as a small, reusable sprite/lottie set so it maps cleanly to components
(see [components](../02-design-system/components.md)):

| Expression | Used in | Feeling |
|-----------|---------|---------|
| **Wave / hello** | splash, empty states, guest welcome | friendly invite |
| **Cheer** | you found a pair (_jodi mali gai_), you win | shared joy |
| **Oops / sheepish** | you're the Gadha Chor | gentle, self-deprecating |
| **Think** | bot's turn, loading, tutorial hints | patient, cozy |
| **Point / teach** | how-to-play, first-run coaching | helpful guide |
| **Sleep / zzz** | disconnect, idle, "lazy" brand nod | calm, unbothered |
| **Peek** | app icon, headers, card-back accent | charming, curious |

## Usage rules

**Do**

- Use Gaddo for **humor and warmth**: reveals, empty states, tutorials, errors.
- Keep him on-palette (folk cloth accents from the brand colors).
- Let him carry personality so the rest of the UI can stay calm and legible.
- Animate with the app's motion tokens; provide a still fallback for reduced-motion.

**Don't**

- Don't make him mock or shame the loser.
- Don't attach him to anything money/reward-shaped (no coins, no "you won X").
- Don't overuse mid-game — the table must stay readable; he lives at the edges and beats, not on top of the hand.
- Don't redraw him ad hoc — extend the official expression kit so he stays consistent.

## Localization

Gaddo speaks the app's [voice](./voice-and-copywriting.md) in all three languages.
His name and one-liners are localized as first-class copy (ICU messages), never
concatenated. In Hindi/Gujarati contexts he can lean into regional affection
(_"Beta, aa vaar to gadha tame!"_) while staying inclusive for non-Gujarati users.

## Accessibility

- Mascot animations are decorative: every one has a **text/caption equivalent**
  and respects **reduced-motion** (swap to a still pose).
- The mascot never conveys _essential_ information alone (e.g., whose turn it is is
  always stated in text + position too).
