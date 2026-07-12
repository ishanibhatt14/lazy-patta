# Launch Checklist & MVP Definition of Done

The gate between "built" and "families are playing." Nothing ships to stores until
every box is checked.

## MVP definition of done

- [ ] Complete **Gadha Chor** match against bots (guest, no login).
- [ ] Complete **private-room** match across **at least four physical devices**.
- [ ] Refresh/restart **reconnects safely without card leakage**.
- [ ] **English, Gujarati, and Hindi** core flows pass visual QA.
- [ ] **Account creation and deletion** work end to end (in-app + web page).
- [ ] **Report/block** and **nickname profanity filtering** work.
- [ ] **No client can read another player's hand** via API or Realtime (verified test).
- [ ] **Web, iOS, and Android** builds pass smoke tests.
- [ ] **Privacy/support pages** are public.
- [ ] **Store review demo access** (account or demo mode) is available.

## Accessibility gate

- [ ] 48×48 targets; no drag-only actions; visible keyboard focus (web).
- [ ] Contrast AA across every theme; **never color-only** meanings.
- [ ] Screen-reader labels for all icons + card actions; turn/result live regions.
- [ ] Reduced-motion + mute available; every essential sound captioned.
- [ ] Dynamic text to **200%** without clipping; senior mode works.
- [ ] Colorblind-friendly suit option.
(Full criteria: [accessibility](../02-design-system/accessibility.md).)

## Privacy & compliance gate

- [ ] Age rating set (general **13+**, not Kids Category — [D-22](../00-product-bible/decisions-log.md)).
- [ ] Data-safety / privacy answers match actual collection.
- [ ] In-app + `/delete-account` deletion; provider tokens revoked.
- [ ] Privacy policy, terms, community rules, support contact published.
- [ ] iOS: privacy-preserving login option if social login is offered.
- [ ] **No real-money/gambling** surfaces anywhere; "no cash, no betting" clear.

## Quality & reliability gate

- [ ] All CI gates green: lint, typecheck, unit/property, migrations, web build,
      Expo config, Playwright smoke, security scan, a11y/i18n snapshots.
- [ ] Engine invariants all pass (card conservation, one odd card, version bumps).
- [ ] Reconnect success + crash-free session rates healthy in internal testing
      ([analytics](./analytics-and-kpis.md)).
- [ ] Performance verified on a **low-end Android** device.
- [ ] Error monitoring + source maps live.

## Store materials gate

- [ ] Unique icon + real-gameplay screenshots (EN/GU/HI).
- [ ] Localized store listings; brand-safe keywords (no casino terms).
- [ ] "No cash, no betting" positioning in the listing.
- [ ] Reviewer notes + demo credentials/mode.
- [ ] Support + privacy URLs set.

## Go / no-go

- [ ] Feature flags set for launch (live multiplayer / notifications).
- [ ] Staged-rollout plan + rollback path confirmed
      ([release-process](../06-developer-handbook/release-process.md)).
- [ ] Open [decisions](../00-product-bible/decisions-log.md) needed for launch are
      resolved (name/spelling, rule variant, age rating, mobile simultaneity).
- [ ] **Recheck store policies immediately before submission.**

> Source-note: store, privacy, and platform requirements should be re-verified against
> current Apple/Google/Expo/Supabase guidance right before submission — policies change.
