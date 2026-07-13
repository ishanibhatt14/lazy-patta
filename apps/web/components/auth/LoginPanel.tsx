'use client';

import { DEFAULT_LOCALE } from '@lazy-patta/localization';
import { useState, type FormEvent, type ReactElement } from 'react';

import { useAuth } from '../../lib/auth/auth-context';
import { createTranslator } from '../../lib/i18n';
import { Button } from '../Button';

/**
 * Email one-time-passcode sign-in, modelled as the two-step request/verify flow
 * the {@link AuthProvider} contract expects. No passwords are ever collected and
 * the passcode is never logged — it lives only in the input until verified.
 */

const t = createTranslator(DEFAULT_LOCALE);

type Step = 'email' | 'passcode';

function messageFor(error: unknown): string {
  return error instanceof Error && error.message ? error.message : t.t('auth.errorGeneric');
}

export function LoginPanel(): ReactElement {
  const { state, configured, requestPasscode, verifyPasscode, signInAsGuest, signOut } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [busy, setBusy] = useState<'email' | 'verify' | 'guest' | 'sign-out' | undefined>(
    undefined,
  );
  const [error, setError] = useState<string | undefined>(undefined);

  if (!configured) {
    return (
      <p className="rounded-md bg-surface-primary px-4 py-3 text-sm text-text-primary shadow-sm">
        {t.t('auth.notConfigured')}
      </p>
    );
  }

  if (state.status === 'loading') {
    return <p className="text-sm text-text-primary">{t.t('auth.loading')}</p>;
  }

  if (state.status === 'signed-in') {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-text-primary">
          {t.format('auth.signedInAs', { name: state.session.user.displayName })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy !== undefined}
          onClick={async () => {
            setBusy('sign-out');
            setError(undefined);
            try {
              await signOut();
              setStep('email');
              setEmail('');
              setPasscode('');
            } catch (caught) {
              setError(messageFor(caught));
            } finally {
              setBusy(undefined);
            }
          }}
        >
          {t.t('auth.signOut')}
        </Button>
        {error ? <p className="text-sm text-status-error">{error}</p> : null}
      </div>
    );
  }

  const onRequest = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy('email');
    setError(undefined);
    try {
      await requestPasscode(email.trim());
      setStep('passcode');
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(undefined);
    }
  };

  const onVerify = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy('verify');
    setError(undefined);
    try {
      await verifyPasscode(email.trim(), passcode.trim());
      // On success the AuthProvider emits `signed-in` and this panel re-renders.
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(undefined);
    }
  };

  const onGuest = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy('guest');
    setError(undefined);
    try {
      await signInAsGuest(guestName.trim());
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-surface-primary p-6 shadow-sm">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="text-lg font-semibold text-text-primary">{t.t('auth.signInTitle')}</h2>
        <p className="text-sm text-text-primary">{t.t('auth.signInDescription')}</p>
      </div>

      <form className="flex flex-col gap-3" onSubmit={onGuest}>
        <label className="flex flex-col gap-1 text-sm text-text-primary">
          {t.t('auth.guestNameLabel')}
          <input
            type="text"
            autoComplete="nickname"
            maxLength={32}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder={t.t('auth.guestNamePlaceholder')}
            className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-text-primary"
          />
        </label>
        <Button type="submit" disabled={busy !== undefined}>
          {busy === 'guest' ? t.t('auth.continuingAsGuest') : t.t('auth.continueAsGuest')}
        </Button>
        <p className="text-xs text-text-primary">{t.t('auth.guestDescription')}</p>
      </form>

      <div className="h-px bg-action-primary/20" />

      {step === 'email' ? (
        <form className="flex flex-col gap-3" onSubmit={onRequest}>
          <label className="flex flex-col gap-1 text-sm text-text-primary">
            {t.t('auth.emailLabel')}
            <input
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.t('auth.emailPlaceholder')}
              className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-text-primary"
            />
          </label>
          <Button
            type="submit"
            variant="secondary"
            disabled={busy !== undefined || email.trim().length === 0}
          >
            {busy === 'email' ? t.t('auth.sending') : t.t('auth.sendCode')}
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={onVerify}>
          <p className="text-sm text-text-primary">
            {t.format('auth.codeSentTo', { email: email.trim() })}
          </p>
          <label className="flex flex-col gap-1 text-sm text-text-primary">
            {t.t('auth.passcodeLabel')}
            <input
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder={t.t('auth.passcodePlaceholder')}
              className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-center text-lg tracking-[0.4em] text-text-primary"
            />
          </label>
          <Button
            type="submit"
            variant="secondary"
            disabled={busy !== undefined || passcode.trim().length === 0}
          >
            {busy === 'verify' ? t.t('auth.verifying') : t.t('auth.verify')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy !== undefined}
            onClick={() => {
              setStep('email');
              setPasscode('');
              setError(undefined);
            }}
          >
            {t.t('auth.changeEmail')}
          </Button>
        </form>
      )}

      {error ? <p className="text-center text-sm text-status-error">{error}</p> : null}
    </div>
  );
}
