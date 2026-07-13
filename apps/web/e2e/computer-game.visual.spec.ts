import { expect, test, type Page } from '@playwright/test';

/** A fixed `?seed=` makes the deal reproducible, and reduced motion (forced in
 * playwright.config) collapses every intro/pacing delay to a resting frame, so
 * these full-page screenshots are deterministic across runs. */
const SEED = 424242;
const ROUTE = `/play/gadha-chor/computer?seed=${SEED}`;

const VIEWPORTS = [
  { name: 'mobile-360x800', width: 360, height: 800 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1440x1024', width: 1440, height: 1024 },
] as const;

async function startGame(page: Page, players: number): Promise<void> {
  await page.goto(ROUTE);
  await page.getByRole('button', { name: String(players), exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.locator('[data-seat-id]')).toHaveCount(players);
  // Wait for the settled steady state: the intro sequence has finished, it is the
  // human's turn, and the eligible hidden-card fan is on screen. This is the
  // deterministic frame — without it the screenshot can race the intro phases.
  await expect(page.locator('button[data-position-token]').first()).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test(`immersive table matches baseline at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await startGame(page, 4);
    await expect(page).toHaveScreenshot(`immersive-table-${viewport.name}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });
}
