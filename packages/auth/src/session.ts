import { type AuthUser } from './identity';

/**
 * A session represents an authenticated account as observed by the client.
 *
 * Access/refresh tokens are intentionally NOT part of this shape. They are held
 * by the provider adapter and, on the server, in server-only environment/state.
 * Client code decides *what to render* from `user`; it never sees raw tokens.
 */
export interface Session {
  readonly user: AuthUser;
  /** Epoch millis at which the underlying credential expires, if known. */
  readonly expiresAt?: number;
}

export type SessionState =
  | { readonly status: 'loading' }
  | { readonly status: 'signed-out' }
  | { readonly status: 'signed-in'; readonly session: Session };
