import { buildAppleAppSiteAssociation } from '../../../lib/deep-links';

// Static: the payload depends only on build-time env, and Apple fetches this
// file without following redirects, so it must be served directly with
// `application/json` (no extension, no redirect).
export const dynamic = 'force-static';

export function GET(): Response {
  const association = buildAppleAppSiteAssociation();
  if (!association) {
    // No Apple identifiers configured yet — do not ship a placeholder that would
    // register a bogus app association. See docs/domain-migration-checklist.md.
    return new Response('Not found', { status: 404 });
  }
  return new Response(JSON.stringify(association), {
    headers: { 'content-type': 'application/json' },
  });
}
