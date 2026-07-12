# Voice & Copywriting

How Lazy Patta speaks — in English, ગુજરાતી, and हिन्दी. Copy is a core part of
the "grandparents' house" feeling, so it gets the same care as the visuals.

## Voice principles

1. **Family-first & warm.** Talk like a beloved relative at the table, not a brand.
2. **Short & plain.** A grandparent and a 9-year-old both understand it instantly.
3. **Gently playful.** Humor lives mostly around the donkey and celebrations.
4. **Never salesy, never casino.** No "win big," no urgency dark patterns, no jargon.
5. **Inclusive.** Gujarati personality delights without excluding Hindi/English users.

## Tone by moment

| Moment            | Tone                  | Example (EN)                                    |
| ----------------- | --------------------- | ----------------------------------------------- |
| Onboarding        | welcoming, reassuring | "No cash. No betting. Just family fun."         |
| Your turn         | clear, encouraging    | "Your turn — pick one card."                    |
| Found a pair      | celebratory           | "Jodi mali gai! You found a pair."              |
| You win           | joyful, shared        | "Shabash! You win this round."                  |
| Gadha Chor (loss) | gentle, funny, kind   | "You're the Gadha Chor this round! 🫏 Rematch?" |
| Invite            | warm, simple          | "Room ready. Share the code with family."       |
| Disconnect        | calm, reassuring      | "Connection lost. Rejoining your table…"        |
| Error             | honest, no blame      | "Something slipped. Let's try that again."      |

## The three languages

- **English** is the base authoring language and default.
- **ગુજરાતી (Gujarati)** carries the personality — signature phrases live here first.
- **हिन्दी (Hindi)** for the broader Indian audience.

Signature Gujarati phrases used across the app (with English support lines):

| Gujarati                         | Meaning / English line                     |
| -------------------------------- | ------------------------------------------ |
| **Tamaro varo!**                 | "Your turn!"                               |
| **Jodi mali gai!**               | "You found a pair!"                        |
| **Shabash!**                     | "Well done!"                               |
| **Ghar ni ramato. Badha sathe.** | "Home games. Everyone together." (tagline) |
| **Ramat phari?**                 | "Rematch?"                                 |

## Localization implementation rules

These are also engineering requirements (see
[localization package](../05-architecture/) and [i18n](../02-design-system/)):

- **ICU MessageFormat** for all strings (plurals, gender, number/date).
- **Never concatenate** translated fragments — full sentences are single messages.
- **Card ranks and suits are semantic keys** (`rank.J`, `suit.spades`), localized
  centrally, never hard-coded in UI.
- Keep keys **namespaced by screen/feature** (e.g. `game.table.yourTurn`).
- **Pseudo-localization** and long-string testing in CI to catch overflow
  (Gujarati/Devanagari run longer than English — see accessibility a11y at 200%).
- Store-listing / metadata is localized **separately** from in-app copy.

## Copy do / don't

**Do**

- "Play with family, anywhere."
- "Invite your family — no account needed to play the computer."
- Use _jodi_, _varo_, _shabash_ naturally alongside English.
- Frame the loss with affection and an instant rematch.

**Don't**

- "Win big!" / "Jackpot!" / "Beat everyone!" (casino + un-warm)
- "Only 2 minutes left — don't miss out!" (false urgency / dark pattern)
- Long paragraphs, jargon, or app-speak ("leverage," "engage," "utilize").
- Mocking the loser ("Ha! You lost, donkey!") — humor must stay kind.

## Reusable copy blocks

Keep these consistent everywhere they appear (define once as shared strings):

- **Safety line:** "No cash. No betting. Just family fun."
- **Guest CTA:** "Play the computer as a guest."
- **Login rationale:** "Sign in to play live with family and save your stats."
- **Reconnect:** "Connection lost. Rejoining your table…"
- **Delete-account confirm:** honest, reversible-sounding where true, final where not.
