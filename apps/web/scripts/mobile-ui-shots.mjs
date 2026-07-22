// Captures the premium /mobile UI into artifacts/mobile-ui/ for visual review.
// Covers the full journey for every game — Home, games grid, per-game setup and
// active table, plus the honest Rooms "coming soon" screen, the in-app Learn
// How-to-Play sheet, and Settings — at both target viewports and themes.
//
// Run against a PRODUCTION `next start` build (a fresh Playwright Chromium
// cannot hydrate the Next dev server, so interactive clicks silently no-op):
//   pnpm --filter @lazy-patta/web build && \
//     pnpm --filter @lazy-patta/web exec next start --port 3100 &
//   node scripts/mobile-ui-shots.mjs http://127.0.0.1:3100
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../artifacts/mobile-ui');
const THEME_KEY = 'lazy-patta:mobile-theme';

const VIEWPORTS = [
  { tag: '390', width: 390, height: 844 },
  { tag: '320', width: 320, height: 568 },
];

const GAMES = ['gadha-chor', 'lal-satti', 'jhabbu', 'kachuful'];

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
  await page.waitForTimeout(300);
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

      // Game-agnostic surfaces.
      await gotoMobile(page, '/mobile', theme);
      await shot(page, `home-${suffix}`);

      await gotoMobile(page, '/mobile/games', theme);
      await shot(page, `games-${suffix}`);

      // Rooms: the honest "coming soon" screen — no auth, no loader.
      await gotoMobile(page, '/mobile/rooms', theme);
      await shot(page, `rooms-${suffix}`);

      // Learn: list, then open the in-app How-to-Play sheet for the first game.
      await gotoMobile(page, '/mobile/how-to-play', theme);
      await shot(page, `learn-${suffix}`);
      const learnCard = page.getByRole('button', { name: /How to play/i }).first();
      if (await learnCard.count()) {
        await learnCard.click();
        await page.waitForTimeout(400);
        await shot(page, `learn-sheet-${suffix}`, { fullPage: false });
      }

      await gotoMobile(page, '/mobile/settings', theme);
      await shot(page, `settings-${suffix}`);

      // Per-game journey: shared setup shell → active table.
      for (const slug of GAMES) {
        await gotoMobile(page, `/mobile/game/${slug}/setup?mode=computer`, theme);
        await shot(page, `setup-${slug}-${suffix}`);

        const start = page.getByRole('button', { name: /^Start game$/i }).first();
        if (await start.count()) {
          await start.click();
          // Setup creates a session and routes to the auto-starting table.
          await page.waitForURL(/\/computer\//, { timeout: 8000 }).catch(() => undefined);
          await page.waitForTimeout(2500);
          await shot(page, `table-${slug}-${suffix}`, { fullPage: false });
        }
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
