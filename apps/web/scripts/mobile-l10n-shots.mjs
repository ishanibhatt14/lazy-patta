// Localization QA capture: shoots the /mobile journey in Gujarati and Hindi so
// we can eyeball truncation / overflow in the non-English shells. English is
// already covered by mobile-ui-shots.mjs; this focuses on the surfaces with the
// most text pressure (chrome, per-game setup + table, result overlays) at both
// target widths, on the primary (dark) theme.
//
// Run against a PRODUCTION `next start` build (a fresh Playwright Chromium
// cannot hydrate the Next dev server, so interactive clicks silently no-op):
//   pnpm --filter @lazy-patta/web build && \
//     pnpm --filter @lazy-patta/web exec next start --port 3100 &
//   node scripts/mobile-l10n-shots.mjs http://127.0.0.1:3100
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { chromium } from '@playwright/test';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3100';
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../artifacts/mobile-ui/l10n');
const THEME_KEY = 'lazy-patta:mobile-theme';
const LOCALE_STORAGE_KEY = 'lazy-patta:preferred-locale';
const LOCALE_COOKIE = 'lazy-patta-preferred-locale';
const THEME = 'dark';

const VIEWPORTS = [
  { tag: '390', width: 390, height: 844 },
  { tag: '320', width: 320, height: 568 },
];

const LOCALES = ['gu', 'hi'];

const GAMES = ['gadha-chor', 'lal-satti', 'jhabbu', 'kachuful'];
const RESULT_GAMES = ['lal-satti', 'jhabbu', 'kachuful'];
const RESULT_SEED = 42;

// Localized button labels so the interactive clicks work outside English.
const START_LABEL = {
  gu: 'રમત શરૂ કરો',
  hi: 'खेल शुरू करें',
};
const PLAY_AGAIN_LABEL = {
  'lal-satti': { gu: 'આગળનો રાઉન્ડ', hi: 'अगला राउंड' },
  jhabbu: { gu: 'ઝબ્બુ ફરી રમો', hi: 'झब्बू फिर खेलें' },
  kachuful: { gu: 'ફરી રમો', hi: 'दोबारा खेलें' },
};

async function shot(page, name, { fullPage = true } = {}) {
  await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage });
  console.log('  saved', name);
}

async function seed(context, locale) {
  // Cookie feeds SSR (server render), localStorage feeds client hydration —
  // seed both so first paint and the hydrated tree agree on the locale/theme.
  await context.addCookies([
    { name: LOCALE_COOKIE, value: locale, url: BASE },
  ]);
  await context.addInitScript(
    ([themeKey, theme, localeKey, loc]) => {
      window.localStorage.setItem(themeKey, theme);
      window.localStorage.setItem(localeKey, loc);
    },
    [THEME_KEY, THEME, LOCALE_STORAGE_KEY, locale],
  );
}

async function goto(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    for (const locale of LOCALES) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2,
        reducedMotion: 'reduce',
      });
      await seed(context, locale);
      const page = await context.newPage();
      const suffix = `${locale}-${vp.tag}`;
      console.log(`Locale ${suffix}`);

      // Chrome with the most text pressure.
      await goto(page, '/mobile');
      await shot(page, `home-${suffix}`);
      await goto(page, '/mobile/games');
      await shot(page, `games-${suffix}`);
      await goto(page, '/mobile/settings');
      await shot(page, `settings-${suffix}`);

      // Per-game setup → active table.
      for (const slug of GAMES) {
        await goto(page, `/mobile/game/${slug}/setup?mode=computer`);
        await shot(page, `setup-${slug}-${suffix}`);

        const start = page.getByRole('button', { name: START_LABEL[locale] }).first();
        if (await start.count()) {
          await start.click();
          await page.waitForURL(/\/computer\//, { timeout: 8000 }).catch(() => undefined);
          await page.waitForTimeout(2500);
          await shot(page, `table-${slug}-${suffix}`, { fullPage: false });
        }
      }

      // Result overlays via the ?preview=result seam.
      for (const slug of RESULT_GAMES) {
        await goto(
          page,
          `/mobile/game/${slug}/setup?mode=computer&preview=result&seed=${RESULT_SEED}`,
        );
        const start = page.getByRole('button', { name: START_LABEL[locale] }).first();
        if (await start.count()) {
          await start.click();
          await page.waitForURL(/\/computer\//, { timeout: 8000 }).catch(() => undefined);
          await page
            .getByRole('button', { name: PLAY_AGAIN_LABEL[slug][locale] })
            .first()
            .waitFor({ timeout: 8000 })
            .catch(() => undefined);
          await page.waitForTimeout(400);
          await shot(page, `result-${slug}-${suffix}`, { fullPage: false });
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
