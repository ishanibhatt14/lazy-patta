import { expect, test } from '@playwright/test';

test.describe('online room invites', () => {
  test('renders the shared join route inside the online auth boundary', async ({ page }) => {
    await page.goto('/join/BA2026');

    await expect(page.locator('body')).toContainText(
      /Sign in to play online|Online play is not (configured|set up)/i,
    );
    await expect(page.locator('body')).not.toContainText(/This page couldn.t load/i);
  });
});
