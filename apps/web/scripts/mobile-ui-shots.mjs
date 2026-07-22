// Captures the premium /mobile UI into artifacts/mobile-ui/ for visual review.
// Hits the already-running dev server (default 3111) so no production build is
// needed. Usage: node scripts/mobile-ui-shots.mjs [baseURL]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3111';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../artifacts/mobile-ui');
const THEME_KEY = 'lazy-patta:mobile-theme';

const VIEWPORTS = [
  { tag: '390', width: 390, height: 844 },
  { tag: '320', width: 320, height: 568 },
];

async function shot(page, name, { fullPage = true } = {}) {
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage });
  console.log('  saved', name);
}

async function gotoMobile(page, path, theme) {
  // Seed the persisted theme before the app boots so first paint matches.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [THEME_KEY, theme],
  );
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const suffix = `${vp.tag}-${theme}`;
      console.log(`Viewport ${suffix}`);

      // Home.
      await gotoMobile(page, '/mobile', theme);
      await shot(page, `home-${suffix}`);

      // Games grid.
      await gotoMobile(page, '/mobile/games', theme);
      await shot(page, `games-${suffix}`);

      // Setup bottom sheet: tap the first available game tile. The sheet is a
      // fixed-position modal, so capture the viewport (not fullPage). Dev-server
      // hydration can lag the first paint, so retry the click until it opens.
      const tile = page.locator('button:has-text("Gadha Chor")').first();
      const dialog = page.locator('[role="dialog"]');
      if (await tile.count()) {
        for (let i = 0; i < 10 && (await dialog.count()) === 0; i += 1) {
          await tile.click();
          await page.waitForTimeout(300);
        }
        await page.waitForTimeout(400);
        await shot(page, `sheet-${suffix}`, { fullPage: false });
      }

      // Settings.
      await gotoMobile(page, '/mobile/settings', theme);
      await shot(page, `settings-${suffix}`);

      // Computer setup.
      await gotoMobile(page, '/play/gadha-chor/computer', theme);
      await shot(page, `setup-${suffix}`);

      // Active felt table: start the game and wait for the felt shell to mount.
      const start = page.locator('button:has-text("Start game")').first();
      const felt = page.locator('.gc-shell');
      if (await start.count()) {
        for (let i = 0; i < 10 && (await felt.count()) === 0; i += 1) {
          await start.click();
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(1500);
        await shot(page, `table-${suffix}`, { fullPage: false });
      }

      await context.close();
    }
  }

  await browser.close();
  console.log('Done →', OUT);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
