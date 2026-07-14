import { expect, test } from '@playwright/test';

test.describe('rich landing page', () => {
  test('keeps one trust group and places games immediately after the hero', async ({ page }) => {
    await page.goto('/');

    const trustGroup = page.locator('[aria-label="Why families can play safely"]');
    await expect(trustGroup).toHaveCount(1);
    await expect(trustGroup.getByText('No cash or betting', { exact: true })).toBeVisible();
    await expect(trustGroup.getByText('Guest play', { exact: true })).toBeVisible();
    await expect(trustGroup.getByText('Private family rooms', { exact: true })).toBeVisible();
    await expect(
      trustGroup.getByText('English, Gujarati and Hindi', { exact: true }),
    ).toBeVisible();

    const order = await page.evaluate(() => {
      const hero = document.querySelector('section[aria-labelledby="landing-hero-title"]');
      const games = document.querySelector('section[aria-labelledby="landing-games-title"]');
      return Boolean(hero && games && hero.nextElementSibling === games);
    });
    expect(order).toBe(true);
  });

  test('exposes primary routes, tutorials, and unavailable mode state', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Desi card games\. Family game night, anywhere\./i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Start with Gadha Chor/i })).toHaveAttribute(
      'href',
      '/play/gadha-chor/computer',
    );
    await expect(page.getByRole('link', { name: /Start a private family room/i })).toHaveAttribute(
      'href',
      '/play/online?game=gadha_chor',
    );
    await expect(page.getByRole('link', { name: /Start family room/i }).first()).toHaveAttribute(
      'href',
      '/play/online?game=gadha_chor',
    );
    await expect(page.getByRole('link', { name: /Start family room/i }).nth(1)).toHaveAttribute(
      'href',
      '/play/online?game=lal_satti',
    );
    await expect(page.getByRole('link', { name: /Practice with bots/i }).first()).toHaveAttribute(
      'href',
      '/play/gadha-chor/computer',
    );
    await expect(page.getByRole('link', { name: /Practice with bots/i }).nth(1)).toHaveAttribute(
      'href',
      '/play/lal-satti/computer',
    );

    await page
      .getByRole('button', { name: /Learn the rules/i })
      .first()
      .click();
    await expect(page.getByRole('dialog')).toContainText(/Match pairs/i);
    await page.getByRole('button', { name: /Skip/i }).click();
    await page
      .getByRole('button', { name: /Learn the rules/i })
      .nth(1)
      .click();
    await expect(page.getByRole('dialog')).toContainText(/Start from the sevens/i);

    await expect(page.getByText(/Pass and Play/i).locator('..')).toContainText(/Coming soon/i);
  });

  test('persists full language selection across reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /English/i }).click();
    await expect(page.getByRole('button', { name: /ગુજરાતી Gujarati/i })).toBeVisible();
    await page.getByRole('button', { name: /ગુજરાતી Gujarati/i }).click();
    await expect(page.getByRole('heading', { name: /દેશી પત્તાની રમતો/i })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: /દેશી પત્તાની રમતો/i })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'gu');
  });

  test('keeps the desktop language menu inset and long labels contained', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    await page.goto('/');

    await page.getByRole('button', { name: /English/i }).click();
    const menu = page.locator('.language-menu');
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(16);
    expect(box!.x + box!.width).toBeLessThanOrEqual(1440 - 16);

    await expect(page.getByRole('button', { name: /ગુજરાતી Gujarati/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /हिन्दी Hindi/i })).toBeVisible();

    const overflowingLabels = await menu.locator('button span span').evaluateAll((labels) =>
      labels
        .filter((label) => /ગુજરાતી|Gujarati|हिन्दी|Hindi/.test(label.textContent ?? ''))
        .map((label) => ({
          text: label.textContent,
          overflow: label.scrollWidth > label.clientWidth + 1,
        }))
        .filter((entry) => entry.overflow),
    );
    expect(overflowingLabels).toEqual([]);
  });

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    test(`keeps the mobile hero-to-games transition compact at ${viewport.width}x${viewport.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');

      const metrics = await page.evaluate(() => {
        const hero = document
          .querySelector('section[aria-labelledby="landing-hero-title"]')
          ?.getBoundingClientRect();
        const games = document
          .querySelector('section[aria-labelledby="landing-games-title"]')
          ?.getBoundingClientRect();
        const firstGamesText = document
          .querySelector('section[aria-labelledby="landing-games-title"] p')
          ?.getBoundingClientRect();
        return {
          sectionGap: hero && games ? games.top - hero.bottom : null,
          firstContentGap: hero && firstGamesText ? firstGamesText.top - hero.bottom : null,
          pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });

      expect(metrics.sectionGap).toBe(0);
      expect(metrics.firstContentGap).toBeGreaterThanOrEqual(32);
      expect(metrics.firstContentGap).toBeLessThanOrEqual(48);
      expect(metrics.pageOverflow).toBeLessThanOrEqual(1);
    });
  }

  test('supports keyboard navigation and mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /English/i })).toBeFocused();

    await page.getByRole('button', { name: /Menu/i }).click();
    await expect(page.getByRole('navigation', { name: /Landing navigation/i })).toContainText(
      /Games/i,
    );
  });

  test('renders reduced-motion-safe hero information', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Reduced motion family card table/i)).toBeAttached();
  });

  test('renders localized game discovery pages', async ({ page }) => {
    await page.goto('/hi/games/gadha-chor');
    await expect(
      page.getByRole('heading', { name: 'गधा चोर ऑनलाइन खेलें', level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/गुलाम चोर/i).first()).toBeVisible();

    await page.goto('/gu/games/lal-satti');
    await expect(
      page.getByRole('heading', { name: 'લાલ સત્તી ઓનલાઈન રમો', level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/બાદામ સાત/i).first()).toBeVisible();
  });
});
