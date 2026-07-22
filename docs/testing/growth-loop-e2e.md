# Growth Loop E2E Procedure

Use the existing web Playwright setup:

```bash
pnpm --filter @lazy-patta/web test:e2e
```

## Primary Journey

1. Open `/mobile` in context A.
2. Select Gadha Chor.
3. Open Create Family Room.
4. Create a room and assert one room code is issued.
5. Copy the `/join/{code}` invitation.
6. Open the link in context B.
7. Complete guest sign-in with a display name.
8. Assert both players appear in the lobby.
9. Mark both ready.
10. Start the game once as host.
11. Complete a deterministic round.
12. Assert a game-specific result and result-share text.
13. Submit rematch votes from both contexts.
14. Assert one next round starts and the room code is preserved.

## Failure Journeys

- `/api/rooms/health` unavailable
- Slow create/join request
- Invalid room code
- Expired room
- Full room
- Already-started room
- Duplicate create, join, and start taps
- Browser refresh in lobby and result
- Native share unavailable and cancelled
- Clipboard unavailable

## Current Blockers

Realtime, persisted rematch voting, and deterministic multiplayer round
completion still need backend support before the full primary journey can pass
end to end.
