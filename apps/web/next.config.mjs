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
      { source: '/play/online', destination: '/play/gadha-chor/online', permanent: false },
      {
        source: '/play/online/:code',
        destination: '/play/gadha-chor/online/:code',
        permanent: false,
      },
      { source: '/play/lal-satti', destination: '/play/lal-satti/computer', permanent: false },
    ];
  },
};

export default nextConfig;
