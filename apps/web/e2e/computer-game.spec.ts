import { expect, test, type Page } from '@playwright/test';

const ROUTE = '/play/gadha-chor/computer';

async function startGame(page: Page, players: number): Promise<void> {
  await page.goto(ROUTE);
  await page.getByRole('button', { name: String(players), exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
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
    await expect.poll(async () => (await cards.count()) > 0 || (await done.isVisible())).toBe(true);
    if (await done.isVisible()) return;
    await cards.first().click();
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
  await expect(
    page.getByRole('heading', { name: /Gadha Chor at the family table/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'ગુ' }).click();
  await expect(page.getByRole('heading', { name: 'કુટુંબની ટેબલ પર ગધા ચોર' })).toBeVisible();
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
