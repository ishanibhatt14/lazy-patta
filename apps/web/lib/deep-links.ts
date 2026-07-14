/**
 * Shared config for the mobile deep-link association files served under
 * `/.well-known`. Production identifiers (Apple Team ID, bundle/package names,
 * Android signing fingerprint) are supplied by the owner via environment
 * variables — we never invent them. Until every required value for a platform
 * is present, that platform's association file is served as `404` so an
 * unresolved placeholder can never ship as if it were valid.
 */

/** Paths handled by the installed app when a Universal Link / App Link opens. */
export const DEEP_LINK_PATH_PATTERNS = ['/join/*', '/play/*', '/games/*'] as const;

function readEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export interface AppleAppSiteAssociation {
  readonly applinks: {
    readonly apps: readonly string[];
    readonly details: readonly {
      readonly appIDs: readonly string[];
      readonly components: readonly { readonly '/': string }[];
    }[];
  };
}

/** Builds the AASA payload, or `null` when Apple identifiers are not configured. */
export function buildAppleAppSiteAssociation(): AppleAppSiteAssociation | null {
  const teamId = readEnv(process.env.APPLE_TEAM_ID);
  const bundleId = readEnv(process.env.IOS_BUNDLE_ID);
  if (!teamId || !bundleId) return null;

  return {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [`${teamId}.${bundleId}`],
          components: DEEP_LINK_PATH_PATTERNS.map((pattern) => ({ '/': pattern })),
        },
      ],
    },
  };
}

export interface AndroidAssetLink {
  readonly relation: readonly string[];
  readonly target: {
    readonly namespace: 'android_app';
    readonly package_name: string;
    readonly sha256_cert_fingerprints: readonly string[];
  };
}

/** Builds the assetlinks payload, or `null` when Android identifiers are absent. */
export function buildAndroidAssetLinks(): readonly AndroidAssetLink[] | null {
  const packageName = readEnv(process.env.ANDROID_PACKAGE_NAME);
  const fingerprint = readEnv(process.env.ANDROID_SHA256_CERT_FINGERPRINT);
  if (!packageName || !fingerprint) return null;

  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ];
}
