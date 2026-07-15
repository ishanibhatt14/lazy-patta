import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { metadata } from './layout';
import manifest from './manifest';

const publicDir = join(process.cwd(), 'public');

function readPngSize(path: string): { readonly width: number; readonly height: number } {
  const bytes = readFileSync(path);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

describe('web icon assets', () => {
  it('uses symbol-only favicon assets instead of the full wordmark', () => {
    expect(metadata.icons).toMatchObject({
      icon: [
        { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
        { url: '/icons/favicon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      shortcut: '/favicon.ico',
      apple: {
        url: '/icons/apple-touch-icon-180.png',
        sizes: '180x180',
        type: 'image/png',
      },
    });
  });

  it('declares PWA icons for any and maskable installs', () => {
    const result = manifest();

    expect(result.id).toBe('/');
    expect(result.start_url).toBe('/play');
    expect(result.scope).toBe('/');
    expect(result.display).toBe('standalone');
    expect(result.icons).toEqual([
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ]);
  });

  it('ships every required raster size', () => {
    const expectedSizes = new Map([
      ['icons/favicon-48.png', 48],
      ['icons/favicon-96.png', 96],
      ['icons/favicon-192.png', 192],
      ['icons/apple-touch-icon-180.png', 180],
      ['icons/icon-192.png', 192],
      ['icons/icon-512.png', 512],
      ['icons/icon-maskable-512.png', 512],
      ['icons/app-icon-master-1024.png', 1024],
    ]);

    for (const [path, size] of expectedSizes) {
      expect(readPngSize(join(publicDir, path))).toEqual({ width: size, height: size });
    }

    const ico = readFileSync(join(publicDir, 'favicon.ico'));
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
  });
});
