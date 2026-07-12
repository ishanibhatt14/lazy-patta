import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    if (full.endsWith('.ts') && !full.endsWith('.test.ts')) return [full];
    return [];
  });
}

const IMPORT_RE = /(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/g;

// The engine is pure: it may import only game-contracts, relative modules, and
// Node built-ins used by nothing here. No UI, no network, no Supabase (ADR-0003).
const FORBIDDEN = [
  'react',
  'react-native',
  'next',
  '@supabase',
  'supabase',
  'node:fs',
  'node:net',
  'node:http',
  'fs',
  'http',
  'https',
  'axios',
];

describe('game-engine dependency boundary', () => {
  const files = sourceFiles(join(__dirname));

  it('has source files to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('imports only @lazy-patta/game-contracts and relative modules', () => {
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const match of src.matchAll(IMPORT_RE)) {
        const spec = match[1]!;
        const isRelative = spec.startsWith('.');
        const isContracts = spec === '@lazy-patta/game-contracts';
        if (!isRelative && !isContracts) {
          violations.push(`${file}: ${spec}`);
        }
        if (FORBIDDEN.some((f) => spec === f || spec.startsWith(`${f}/`))) {
          violations.push(`${file}: forbidden ${spec}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
