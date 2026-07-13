import { resolveColors } from '@lazy-patta/design-tokens';
import { DEFAULT_LOCALE, getMessages } from '@lazy-patta/localization';
import type { MetadataRoute } from 'next';

/**
 * PWA web app manifest. Colors come from the design system (maroon =
 * `action.primary`), matching the opaque icon background so the installed-app
 * chrome and splash blend with the brand. Icons are the maroon-backed opaque
 * variant: Android masks it into launcher shapes via `purpose: 'maskable'`, and
 * `purpose: 'any'` covers browsers that want a plain icon. A single 1024² source
 * is downscaled by the platform; export dedicated 192/512 sizes before store
 * submission for crisper small renders.
 */
const messages = getMessages(DEFAULT_LOCALE);
const colors = resolveColors();

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: messages['app.name'],
    short_name: messages['app.name'],
    description: messages['welcome.tagline'],
    start_url: '/',
    display: 'standalone',
    background_color: colors['action.primary'],
    theme_color: colors['action.primary'],
    icons: [
      {
        src: '/images/lazy-patta-ios-icon-opaque-maroon-1024.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/images/lazy-patta-ios-icon-opaque-maroon-1024.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
