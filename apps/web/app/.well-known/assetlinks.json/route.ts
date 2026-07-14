import { buildAndroidAssetLinks } from '../../../lib/deep-links';

export const dynamic = 'force-static';

export function GET(): Response {
  const assetLinks = buildAndroidAssetLinks();
  if (!assetLinks) {
    // No Android package/fingerprint configured yet — serving 404 keeps App Links
    // unverified rather than asserting a bogus fingerprint.
    return new Response('Not found', { status: 404 });
  }
  return new Response(JSON.stringify(assetLinks), {
    headers: { 'content-type': 'application/json' },
  });
}
