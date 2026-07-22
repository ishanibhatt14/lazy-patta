# Invitation Links

The canonical invitation route is:

```text
https://lazypatta.com/join/{ROOM_CODE}
```

`ROOM_CODE` is normalized to uppercase and validated against the production
alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. Ambiguous characters `I`, `O`,
`0`, and `1` are rejected.

## Allowed Data

- Room code
- Optional public game slug in a query string
- Public brand/game metadata for Open Graph

## Forbidden Data

- Membership tokens
- Guest tokens
- Player IDs
- Internal database IDs
- Card hands or hidden scores
- Recipient information

## Share Behavior

`RoomSharePanel` is exported as `FamilyInviteShare`. It supports native Web Share,
WhatsApp, copy-link, and copy-code fallbacks. Native share cancellation is not
reported as an error, and WhatsApp is opened only after a user action.

## Metadata

`/join/[roomCode]` generates noindex Open Graph metadata server-side. It uses a
static Lazy Patta icon and does not query private room state.
