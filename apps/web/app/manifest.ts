import { resolveColors } from '@lazy-patta/design-tokens';
import { DEFAULT_LOCALE, getMessages } from '@lazy-patta/localization';
import type { MetadataRoute } from 'next';

/** PWA manifest using the symbol-only Lazy Patta mark rather than the wordmark. */
const messages = getMessages(DEFAULT_LOCALE);
const colors = resolveColors();

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: messages['app.name'],
    short_name: messages['app.name'],
    description: messages['welcome.tagline'],
    id: '/',
    start_url: '/play',
    scope: '/',
    display: 'standalone',
    background_color: colors['background.canvas'],
    theme_color: colors['action.primary'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
