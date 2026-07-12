#!/usr/bin/env node
// Dependency-free internal link checker for the Product Bible + repo docs.
// Validates every relative Markdown link target file exists and, when the link
// carries a #anchor, that a matching heading slug exists in the target file.
// External links (http/https/mailto) are skipped. Exits non-zero on any break.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Recursively collect Markdown files under a directory. */
function collectMarkdown(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectMarkdown(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/** GitHub-style heading slug. */
function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s/g, '-');
}

/** Set of anchor slugs a Markdown file exposes (deduped like GitHub). */
function anchorsOf(content) {
  const seen = new Map();
  const slugs = new Set();
  for (const line of content.split('\n')) {
    const m = /^#{1,6}\s+(.*)$/.exec(line);
    if (!m) continue;
    const base = slugify(m[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    slugs.add(n === 0 ? base : `${base}-${n}`);
  }
  return slugs;
}

const files = [
  ...collectMarkdown(join(repoRoot, 'docs')),
  ...['README.md', 'CONTRIBUTING.md', 'supabase/README.md']
    .map((f) => join(repoRoot, f))
    .filter((f) => {
      try {
        return statSync(f).isFile();
      } catch {
        return false;
      }
    }),
];

const anchorCache = new Map();
function anchorsFor(file) {
  if (!anchorCache.has(file)) anchorCache.set(file, anchorsOf(readFileSync(file, 'utf8')));
  return anchorCache.get(file);
}

const linkRe = /!?\[[^\]]*\]\(([^)\s]+)\)/g;
const broken = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(linkRe)) {
    const target = match[1];
    if (/^(https?:|mailto:|tel:)/.test(target)) continue;

    const [pathPart, anchor] = target.split('#');
    let resolvedFile = file;

    if (pathPart) {
      resolvedFile = resolve(dirname(file), pathPart);
      let ok = false;
      try {
        ok = statSync(resolvedFile).isFile() || statSync(resolvedFile).isDirectory();
      } catch {
        ok = false;
      }
      if (!ok) {
        broken.push(`${relative(repoRoot, file)} -> ${target} (missing file)`);
        continue;
      }
    }

    if (anchor && resolvedFile.endsWith('.md')) {
      let isDir = false;
      try {
        isDir = statSync(resolvedFile).isDirectory();
      } catch {
        isDir = false;
      }
      if (!isDir && !anchorsFor(resolvedFile).has(anchor)) {
        broken.push(`${relative(repoRoot, file)} -> ${target} (missing anchor #${anchor})`);
      }
    }
  }
}

if (broken.length > 0) {
  console.error(`Found ${broken.length} broken link(s):`);
  for (const b of broken) console.error(`  ${b}`);
  process.exit(1);
}

console.log(`Link check passed: scanned ${files.length} Markdown files, 0 broken links.`);
