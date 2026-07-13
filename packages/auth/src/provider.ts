import { type SessionState } from './session';

/** Unsubscribe handle returned by {@link AuthProvider.onStateChange}. */
export type Unsubscribe = () => void;

/**
 * Contract every concrete auth backend must satisfy. Kept deliberately small:
 * Phase 0 only needs to observe session state and trigger sign-in/out. The
 * actual credential exchange (OTP delivery, token refresh) is an implementation
 * detail of the adapter and never surfaces here.
 *
 * A one-time passcode is the expected first mechanism, modelled as a two-step
 * request/verify so that no adapter is forced to hold a password.
 */
export interface AuthProvider {
  /** Current session snapshot. Synchronous read of the last known state. */
  getState(): SessionState;

  /** Subscribe to session changes. Fires immediately with the current state. */
  onStateChange(listener: (state: SessionState) => void): Unsubscribe;

  /** Begin sign-in by dispatching a passcode to the given contact. */
  requestPasscode(contact: string): Promise<void>;

  /** Complete sign-in by verifying a passcode previously requested. */
  verifyPasscode(contact: string, passcode: string): Promise<void>;

  /** Create a temporary authenticated guest account for low-friction play. */
  signInAsGuest(displayName: string): Promise<void>;

  /** End the current session. */
  signOut(): Promise<void>;
}
