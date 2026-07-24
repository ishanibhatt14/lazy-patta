import { expect, test, type Page } from '@playwright/test';

const ROUTE = '/play/gadha-chor/computer?seed=424242';

test.setTimeout(60_000);

async function startGame(page: Page, players: number): Promise<void> {
  await page.goto(ROUTE);
  if (players !== 4) await page.getByRole('button', { name: String(players), exact: true }).click();
  await page.getByRole('button', { name: /Deal the cards/i }).click();
  // Table is up once the live turn banner renders.
  await expect(page.getByRole('status')).toBeVisible();
}

function hiddenCards(page: Page) {
  return page.locator('button[data-position-token]');
}

function playAgain(page: Page) {
  return page.getByRole('button', { name: /Play again/i });
}

/** Play to the end by always taking the first eligible card, waiting only on
 * observable states (never fixed sleeps). */
async function playToResult(page: Page): Promise<void> {
  const cards = hiddenCards(page);
  const done = playAgain(page);
  for (let guard = 0; guard < 400; guard += 1) {
    if (await done.isVisible()) return;
    await expect
      .poll(async () => (await cards.count()) > 0 || (await done.isVisible()), { timeout: 15_000 })
      .toBe(true);
    if (await done.isVisible()) return;
    await cards.first().click({ force: true });
  }
  throw new Error('game did not reach a result');
}

test('starts a two-player game against a single bot', async ({ page }) => {
  await startGame(page, 2);
  await expect(page.locator('[data-seat-id]')).toHaveCount(2);
});

test('starts a four-player game with a full table', async ({ page }) => {
  await startGame(page, 4);
  await expect(page.locator('[data-seat-id]')).toHaveCount(4);
});

test('plays a full game through to a Gadha Chor result', async ({ page }) => {
  await startGame(page, 3);
  await playToResult(page);
  await expect(playAgain(page)).toBeVisible();
  await expect(page.getByRole('link', { name: /Return home/i })).toBeVisible();
});

test('rematch deals a fresh round from the result screen', async ({ page }) => {
  await startGame(page, 2);
  await playToResult(page);
  await playAgain(page).click();
  await expect(playAgain(page)).toBeHidden();
  await expect(page.getByRole('status')).toBeVisible();
});

test('switches the setup language to Gujarati', async ({ page }) => {
  await page.goto(ROUTE);
  await expect(page.getByRole('heading', { name: /Play Gadha Chor/i })).toBeVisible();
  await page.getByRole('button', { name: /English/ }).click();
  await page.getByRole('button', { name: /ગુજરાતી Gujarati/ }).click();
  await expect(page.getByRole('heading', { name: /ગધા ચોર/ })).toBeVisible();
});

test('lets the player pick a card with the keyboard', async ({ page }) => {
  await startGame(page, 2);
  const cards = hiddenCards(page);
  await expect(cards.first()).toBeVisible();
  await cards.first().focus();
  await page.keyboard.press('Enter');
  // The chosen draw resolves — the eligible-card group clears while it reveals.
  await expect(hiddenCards(page)).toHaveCount(0);
});

test('is usable on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await startGame(page, 3);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

/** The device tiers the responsive fan must survive without a horizontal
 * scrollbar or an internally scrolling hand rail. Six players stresses the
 * table layout (the most pods and the widest rim). */
const HAND_VIEWPORTS = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1440, height: 1024 },
] as const;

for (const vp of HAND_VIEWPORTS) {
  test(`fits the full hand with no horizontal scroll at ${vp.width}x${vp.height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await startGame(page, 6);
    const docOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(docOverflow).toBeLessThanOrEqual(1);
    // The whole hand rail sits within the screen — no card row runs off-edge.
    const rail = await page.locator('.gc-hand-rail').boundingBox();
    expect(rail).not.toBeNull();
    expect(rail!.x).toBeGreaterThanOrEqual(-1);
    expect(rail!.x + rail!.width).toBeLessThanOrEqual(vp.width + 1);
  });
}

test('shows the first-turn coach mark until the human draws', async ({ page }) => {
  await startGame(page, 2);
  const coach = page.getByText('Your turn to draw');
  await expect(coach).toBeVisible();
  await hiddenCards(page).first().click();
  await expect(coach).toBeHidden();
});

test('enlarges the hand from the settings sheet without overflowing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startGame(page, 6);
  await page.getByRole('button', { name: /Settings/i }).click();
  const large = page.getByRole('button', { name: /Large cards/i });
  await expect(large).toHaveAttribute('aria-pressed', 'false');
  await large.click();
  await expect(large).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.gc-hand-rail')).toHaveAttribute('data-large-cards', 'true');
  const docOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(docOverflow).toBeLessThanOrEqual(1);
});
