import { expect, test, type Page } from '@playwright/test';

/** A fixed `?seed=` makes the deal reproducible so the interaction assertions
 * (a legal card exists, the human reaches a turn) are stable across runs. */
const SEED = 20260713;
const ROUTE = `/play/lal-satti/computer?seed=${SEED}`;
const PLAIN_ROUTE = '/play/lal-satti/computer';

async function startGame(page: Page, players: number, route = ROUTE): Promise<void> {
  await page.goto(route);
  await page.getByRole('button', { name: `${players} players`, exact: true }).click();
  await page.getByPlaceholder('Enter your name').fill('Aanya');
  await page.getByRole('button', { name: 'Start Lal Satti' }).click();
  // The table is up once the single live turn status renders.
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.locator('[data-seat-id]')).toHaveCount(players);
}

/** Wait for the settled human turn — the deterministic resting frame after the
 * seeded opening (7♥) and any bot lead-in have played out under reduced motion. */
async function waitForHumanTurn(page: Page): Promise<void> {
  await expect(page.getByRole('status')).toContainText('Your turn!', { timeout: 15_000 });
}

test('starts a four-player table with a full rim of pods', async ({ page }) => {
  await startGame(page, 4);
  await expect(page.locator('[data-seat-id]')).toHaveCount(4);
});

test('starts a six-player table', async ({ page }) => {
  await startGame(page, 6);
  await expect(page.locator('[data-seat-id]')).toHaveCount(6);
});

test('keeps exactly one live turn status region on the table', async ({ page }) => {
  await startGame(page, 4);
  await expect(page.getByRole('status')).toHaveCount(1);
});

test('lets the human play a legal card by tap', async ({ page }) => {
  await startGame(page, 4);
  await waitForHumanTurn(page);
  const playable = page.locator('button[data-playable="true"]');
  await expect(playable.first()).toBeVisible();
  const before = await playable.count();
  await playable.first().click();
  // Playing a card either advances the turn away from the human or shrinks the
  // playable set — either way the board reacts to the tap.
  await expect
    .poll(async () => {
      const status = await page.getByRole('status').textContent();
      const stillMine = status?.includes('Your turn!') ?? false;
      const now = await playable.count();
      return !stillMine || now < before;
    })
    .toBe(true);
});

test('lets the human play a legal card with the keyboard', async ({ page }) => {
  await startGame(page, 4);
  await waitForHumanTurn(page);
  const playable = page.locator('button[data-playable="true"]');
  await expect(playable.first()).toBeVisible();
  await playable.first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toBeVisible();
});

test('opens the scoreboard drawer from the top bar', async ({ page }) => {
  await startGame(page, 4);
  await page.getByRole('button', { name: 'Session scoreboard' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('switches the setup language to Gujarati', async ({ page }) => {
  await page.goto(PLAIN_ROUTE);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.getByLabel('Language').selectOption('gu');
  // The start action re-localizes to the Gujarati Lal Satti label.
  await expect(page.getByRole('button', { name: 'લાલ સત્તી શરૂ કરો' })).toBeVisible();
});

test('is usable on a narrow mobile viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await startGame(page, 4);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('builds all four suit rails on the mat', async ({ page }) => {
  await startGame(page, 4);
  await expect(page.locator('.ls-rail')).toHaveCount(4);
});

test('honours the platform reduced-motion preference on the table', async ({ page }) => {
  await startGame(page, 4);
  await expect(page.locator('main.ls-shell')).toHaveAttribute('data-reduced-motion', 'true');
});

test('surfaces unopened suits waiting on their seven', async ({ page }) => {
  await startGame(page, 4);
  await waitForHumanTurn(page);
  // Only hearts can have opened this early, so at least one suit still shows the
  // "opens on its seven" destination anchor.
  await expect(page.getByLabel(/opens on its seven/).first()).toBeVisible();
});

test('shows the playable count and offers no discretionary pass when moves exist', async ({
  page,
}) => {
  await startGame(page, 4);
  await waitForHumanTurn(page);
  await expect(page.getByText(/playable card/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pass turn' })).toHaveCount(0);
});

test('distinguishes playable hand cards from unplayable ones', async ({ page }) => {
  await startGame(page, 4);
  await waitForHumanTurn(page);
  await expect(page.locator('button[data-playable="true"]').first()).toBeVisible();
  await expect(page.locator('button[data-playable="false"]').first()).toBeVisible();
});

test('toggles large-card mode from the settings sheet', async ({ page }) => {
  await startGame(page, 4);
  await page.getByRole('button', { name: 'Settings' }).click();
  const largeCards = page.getByRole('button', { name: 'Large cards' });
  await expect(largeCards).toHaveAttribute('aria-pressed', 'false');
  await largeCards.click();
  await expect(largeCards).toHaveAttribute('aria-pressed', 'true');
});

test('applies high-contrast cards from the settings sheet', async ({ page }) => {
  await startGame(page, 4);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'High-contrast cards' }).click();
  await expect(page.locator('main.ls-shell')).toHaveAttribute('data-high-contrast', 'true');
});

/** Drive one full round by always taking the first legal card, or passing when
 * the engine offers none — waiting only on observable states, never sleeps. */
async function playRoundToResult(page: Page): Promise<void> {
  const nextRound = page.getByRole('button', { name: 'Next round' });
  const playable = page.locator('button[data-playable="true"]');
  const pass = page.getByRole('button', { name: 'Pass turn' });
  for (let guard = 0; guard < 800; guard += 1) {
    if (await nextRound.isVisible()) return;
    await expect
      .poll(
        async () =>
          (await playable.count()) > 0 || (await pass.isVisible()) || (await nextRound.isVisible()),
        { timeout: 30_000 },
      )
      .toBe(true);
    if (await nextRound.isVisible()) return;
    if ((await playable.count()) > 0) {
      await playable.first().click();
    } else if (await pass.isVisible()) {
      await pass.click();
    }
  }
  throw new Error('round did not reach a result');
}

test('plays a full round to the result overlay, reviews scores, and deals again', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await startGame(page, 4);
  await playRoundToResult(page);

  // Round result: winner celebration with the next-round, scores, and home paths.
  await expect(page.getByRole('button', { name: 'Next round' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();

  // The scoreboard drawer lists the round that just finished.
  await page.getByRole('button', { name: 'View scores' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Round 1')).toBeVisible();
  await page.keyboard.press('Escape');

  // Rematch deals a fresh table and the live status returns.
  await page.getByRole('button', { name: 'Next round' }).click();
  await expect(page.getByRole('button', { name: 'Next round' })).toBeHidden();
  await expect(page.getByRole('status')).toBeVisible();
});

test('plays a Gujarati table on a narrow viewport without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(ROUTE);
  await page.getByLabel('Language').selectOption('gu');
  await page.getByRole('button', { name: '4 ખેલાડીઓ', exact: true }).click();
  await page.getByPlaceholder('તમારું નામ લખો').fill('આન્યા');
  await page.getByRole('button', { name: 'લાલ સત્તી શરૂ કરો' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('plays a Hindi table on a narrow viewport without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(ROUTE);
  await page.getByLabel('Language').selectOption('hi');
  await page.getByRole('button', { name: '4 खिलाड़ी', exact: true }).click();
  await page.getByPlaceholder('अपना नाम लिखें').fill('आन्या');
  await page.getByRole('button', { name: 'लाल सत्ती शुरू करें' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
