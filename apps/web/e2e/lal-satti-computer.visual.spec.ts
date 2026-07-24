import { expect, test, type Page } from '@playwright/test';

/** A fixed `?seed=` makes the deal reproducible, and reduced motion (forced in
 * playwright.config) collapses every opening/pacing delay to a resting frame, so
 * these full-page screenshots are deterministic across runs. */
const SEED = 20260713;
const ROUTE = `/play/lal-satti/computer?seed=${SEED}`;

const VIEWPORTS = [
  { name: 'mobile-360x800', width: 360, height: 800 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'desktop-1440x1024', width: 1440, height: 1024 },
] as const;

async function startGame(page: Page, players: number): Promise<void> {
  await page.goto(ROUTE);
  if (players !== 4) await page.getByRole('button', { name: String(players), exact: true }).click();
  await page.getByRole('textbox', { name: 'Table name' }).fill('Aanya');
  await page.getByRole('button', { name: 'Deal the cards' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.locator('[data-seat-id]')).toHaveCount(players);
  // The deterministic resting frame: the seeded opening (7♥) and any bot lead-in
  // have resolved and the table now waits on the human — without this the shot
  // can race the opening/pacing phases.
  await expect(page.getByRole('status')).toContainText('Your turn!', { timeout: 15_000 });
  await expect(page.locator('button[data-playable="true"]').first()).toBeVisible();
}

for (const viewport of VIEWPORTS) {
  test(`immersive Lal Satti table matches baseline at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await startGame(page, 4);
    await expect(page).toHaveScreenshot(`lal-satti-table-${viewport.name}.png`, {
      fullPage: true,
      animations: 'disabled',
      // The human's real hand renders ♥/♦ glyphs whose emoji-vs-text
      // presentation flips between font-load races, producing a bounded ~5%
      // per-run difference. The deal and layout are seed-deterministic, so this
      // tolerance absorbs the glyph flake while still catching a genuine layout
      // regression (a moved pod, missing rail, or broken drawer diffs far more).
      // Fine-grained state coverage lives in the assertion-based spec instead.
      maxDiffPixelRatio: 0.08,
    });
  });
}
