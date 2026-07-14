import { describe, expect, it } from 'vitest';

import { absoluteUrl, siteConfig } from './site-config';

describe('site-config', () => {
  it('defaults the canonical origin to the permanent https domain', () => {
    expect(siteConfig.canonicalOrigin).toBe('https://lazypatta.com');
  });

  it('never emits a preview or localhost origin as canonical', () => {
    expect(siteConfig.canonicalOrigin).not.toContain('vercel.app');
    expect(siteConfig.canonicalOrigin).not.toContain('localhost');
    expect(siteConfig.canonicalOrigin).not.toContain('lazytraveler');
  });

  it('exposes a canonical origin with no trailing slash', () => {
    expect(siteConfig.canonicalOrigin.endsWith('/')).toBe(false);
  });

  it('resolves relative paths to absolute canonical URLs', () => {
    expect(absoluteUrl('/games/gadha-chor')).toBe('https://lazypatta.com/games/gadha-chor');
    expect(absoluteUrl('/')).toBe('https://lazypatta.com/');
  });

  it('uses the canonical support email', () => {
    expect(siteConfig.supportEmail).toBe('support@lazypatta.com');
  });
});
