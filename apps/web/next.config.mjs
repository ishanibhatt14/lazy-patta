/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript source, so Next must transpile them.
  transpilePackages: [
    '@lazy-patta/design-tokens',
    '@lazy-patta/game-contracts',
    '@lazy-patta/localization',
  ],
  // Legacy single-game routes from before the multi-game lobby (`/`, `/games/*`)
  // — keep old links/bookmarks working by forwarding into the game-scoped paths.
  async redirects() {
    return [
      { source: '/play/computer', destination: '/play/gadha-chor/computer', permanent: false },
      { source: '/play/lal-satti', destination: '/play/lal-satti/computer', permanent: false },
      // Spelling-alias game routes fold into the canonical slug (permanent 308).
      // These consolidate SEO signal onto one URL per game instead of spawning a
      // low-value duplicate page for every romanization.
      { source: '/games/gulam-chor', destination: '/games/gadha-chor', permanent: true },
      { source: '/games/gulaam-chor', destination: '/games/gadha-chor', permanent: true },
      { source: '/games/gaddha-chor', destination: '/games/gadha-chor', permanent: true },
      { source: '/games/jack-thief', destination: '/games/gadha-chor', permanent: true },
      { source: '/games/badam-saat', destination: '/games/lal-satti', permanent: true },
      { source: '/games/badam-satti', destination: '/games/lal-satti', permanent: true },
      { source: '/games/seven-of-hearts', destination: '/games/lal-satti', permanent: true },
    ];
  },
};

export default nextConfig;
