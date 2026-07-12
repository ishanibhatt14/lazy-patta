/**
 * Provider-agnostic identity model.
 *
 * The abstraction never references Supabase (or any concrete provider) so that
 * screens, engines, and stores depend only on these shapes. A concrete adapter
 * (e.g. a Supabase-backed provider) lives outside this package and maps vendor
 * types onto these.
 */

/** Stable identifier for an authenticated account. */
export type AuthUserId = string;

/** Locally-generated identifier for a guest (never persisted server-side). */
export type GuestId = string;

/**
 * A guest plays without an account. Their identity is device-local; nothing
 * about them is stored server-side until they choose to sign in and upgrade.
 */
export interface GuestIdentity {
  readonly kind: 'guest';
  readonly guestId: GuestId;
  readonly displayName: string;
}

/** An authenticated account. Tokens are deliberately absent — see {@link Session}. */
export interface AuthUser {
  readonly kind: 'user';
  readonly userId: AuthUserId;
  readonly displayName: string;
  /** Present only after profile setup; screens must tolerate its absence. */
  readonly avatarUrl?: string;
}

export type Identity = GuestIdentity | AuthUser;

export function isGuest(identity: Identity): identity is GuestIdentity {
  return identity.kind === 'guest';
}

export function isAuthenticated(identity: Identity): identity is AuthUser {
  return identity.kind === 'user';
}
