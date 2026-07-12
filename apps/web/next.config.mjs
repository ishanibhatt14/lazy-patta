/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TypeScript source, so Next must transpile them.
  transpilePackages: [
    '@lazy-patta/design-tokens',
    '@lazy-patta/game-contracts',
    '@lazy-patta/localization',
  ],
};

export default nextConfig;
