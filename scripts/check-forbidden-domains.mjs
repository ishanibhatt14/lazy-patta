#!/usr/bin/env node
// Rejects unexpected production references to the old preview host and the
// cross-promo domain in shipped app source. Preview/alias hostnames must never
// be hardcoded — the canonical origin lives only in site-config, fed by
// NEXT_PUBLIC_SITE_URL.
//
// Allowed to mention these strings: migration docs, and this script itself.
// Test files are excluded because they legitimately assert their ABSENCE.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const FORBIDDEN = ['lazy-patta-web.vercel.app', 'play.lazytraveler.app'];

// Directories of shipped source to scan.
const SCAN_ROOTS = [
  'apps/web/app',
  'apps/web/components',
  'apps/web/lib',
  'apps/web/src',
  'apps/mobile/app',
  'apps/mobile/src',
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'];

function isTestFile(name) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(name);
}

function collect(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collect(full));
    } else if (
      CODE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) &&
      !isTestFile(entry.name)
    ) {
      out.push(full);
    }
  }
  return out;
}

const files = SCAN_ROOTS.flatMap((root) => collect(join(repoRoot, root)));
const violations = [];

for (const file of files) {
  if (!statSync(file).isFile()) continue;
  const content = readFileSync(file, 'utf8');
  for (const needle of FORBIDDEN) {
    if (content.includes(needle)) {
      violations.push(`${relative(repoRoot, file)} → "${needle}"`);
    }
  }
}

if (violations.length > 0) {
  console.error('Forbidden production domain references found in app source:');
  for (const v of violations) console.error(`  - ${v}`);
  console.error(
    '\nUse the canonical origin from apps/web/lib/site-config.ts (NEXT_PUBLIC_SITE_URL) instead.',
  );
  process.exit(1);
}

console.log(`check-forbidden-domains: OK (${files.length} files scanned)`);
