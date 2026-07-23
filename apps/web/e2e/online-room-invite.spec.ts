import { expect, test } from '@playwright/test';

// The private-room surfaces are release-gated: a deploy may ship with the table
// service unconfigured (Supabase env absent) or the viewer merely signed out.
// Either way the family-facing pages must degrade to an honest, non-crashing
// state — a sign-in prompt or an "unavailable, practice instead" fallback — and
// never throw the generic boundary error. These specs assert that graceful
// floor without needing a live backend.

const CRASH = /This page couldn.t load/i;

test.describe('online room surfaces', () => {
  test('renders the shared join route inside the online auth boundary', async ({ page }) => {
    await page.goto('/join/BA2026');

    await expect(page.locator('body')).toContainText(
      /Sign in to play online|Online play is not (configured|set up)/i,
    );
    await expect(page.locator('body')).not.toContainText(CRASH);
  });

  test('degrades the online hub to sign-in or an honest unavailable fallback', async ({ page }) => {
    await page.goto('/play/online');

    // Whether the build has the table service configured (→ sign-in) or not
    // (→ "Family rooms are unavailable"), the hub renders a calm, family-safe
    // state that always offers a way forward, never a raw crash.
    await expect(page.locator('body')).toContainText(
      /Sign in to play online|Family rooms are (unavailable|temporarily unavailable)/i,
    );
    await expect(page.locator('body')).not.toContainText(CRASH);
  });
});
