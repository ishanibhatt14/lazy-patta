import { expect, test } from '@playwright/test';

test.describe('rich landing page', () => {
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
    await expect(page.getByRole('link', { name: /Play now/i }).first()).toHaveAttribute(
      'href',
      '/play/gadha-chor/computer',
    );
    await expect(page.getByRole('link', { name: /Play now/i }).nth(1)).toHaveAttribute(
      'href',
      '/play/lal-satti/computer',
    );
    await expect(page.getByRole('link', { name: /Play with family/i }).nth(1)).toHaveAttribute(
      'href',
      '/play/online?game=lal_satti',
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
});
