/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript source, so Next must transpile them.
  transpilePackages: [
    '@lazy-patta/design-tokens',
    '@lazy-patta/game-contracts',
    '@lazy-patta/localization',
  ],
  // Single alias registry: every spelling variant folds into one canonical slug
  // so SEO signal consolidates onto a single URL per game instead of spawning a
  // low-value duplicate page for each romanization. Future games (Judgement,
  // Mendicot, 3-2-5) are intentionally absent — their pages don't exist yet, and
  // redirecting an alias to a 404 is worse than leaving it unhandled.
  async redirects() {
    const SEO_GAME_ALIASES = {
      'gadha-chor': ['gulam-chor', 'gulaam-chor', 'gaddha-chor', 'jack-thief'],
      'lal-satti': ['badam-saat', 'badam-satti', 'laal-satti', 'seven-of-hearts', 'sevens'],
    };
    const LOCALES = ['en', 'gu', 'hi'];

    /** Permanent 308 alias → canonical, both non-prefixed and per-locale. */
    const aliasRedirects = Object.entries(SEO_GAME_ALIASES).flatMap(([canonical, aliases]) =>
      aliases.flatMap((alias) => [
        { source: `/games/${alias}`, destination: `/games/${canonical}`, permanent: true },
        ...LOCALES.map((locale) => ({
          source: `/${locale}/games/${alias}`,
          destination: `/${locale}/games/${canonical}`,
          permanent: true,
        })),
      ]),
    );

    return [
      // Legacy single-game routes from before the multi-game lobby.
      { source: '/play/computer', destination: '/play/gadha-chor/computer', permanent: false },
      { source: '/play/lal-satti', destination: '/play/lal-satti/computer', permanent: false },
      // `/download` is the spec's advertised URL; `/mobile` is the canonical page.
      { source: '/download', destination: '/mobile', permanent: true },
      ...aliasRedirects,
    ];
  },
};

export default nextConfig;
