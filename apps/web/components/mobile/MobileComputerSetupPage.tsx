'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import {
  computerGameInitializer,
  createClientRequestId,
  type ComputerGameConfig,
} from '../../lib/mobile/computer-session';
import { findGameDefinition } from '../../lib/mobile/game-registry';
import { rememberRecentGame } from '../../lib/mobile/recent';
import { Button } from '../Button';

import { MobileComputerGameSetup, defaultComputerConfig } from './MobileComputerGameSetup';

export function MobileComputerSetupPage({ gameSlug }: { readonly gameSlug: string }): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  const game = findGameDefinition(gameSlug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const requestRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const initial = useMemo(() => (game ? defaultComputerConfig(game) : null), [game]);
  const [config, setConfig] = useState<ComputerGameConfig | null>(initial);

  useEffect(() => {
    if (!initial || typeof window === 'undefined' || !window.matchMedia) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) return;
    setConfig((existing) => {
      const next = existing ?? initial;
      return next.reducedMotion ? next : { ...next, reducedMotion: true };
    });
  }, [initial]);

  if (!game || !initial) {
    return (
      <section className="grid min-h-[calc(100dvh-7rem)] place-items-center text-center">
        <div className="grid gap-3 rounded-2xl bg-surface-primary p-5 shadow-sm">
          <h1 className="text-xl font-black text-action-primary">{t.t('error.recoverable')}</h1>
          <Button onClick={() => router.replace('/mobile')}>{t.t('action.returnHome')}</Button>
        </div>
      </section>
    );
  }

  const current = config ?? initial;

  const start = async (): Promise<void> => {
    if (busy) return;
    const requestId = requestRef.current ?? createClientRequestId();
    requestRef.current = requestId;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setBusy(true);
    setError(undefined);
    try {
      const session = await computerGameInitializer.start(
        current,
        requestId,
        abortRef.current.signal,
      );
      rememberRecentGame(game.slug);
      const seed = searchParams.get('seed');
      const nextRoute = game.routes.mobileComputer(session.sessionId);
      router.replace(seed ? `${nextRoute}?seed=${encodeURIComponent(seed)}` : nextRoute);
    } catch (caught) {
      requestRef.current = null;
      setError(caught instanceof Error ? caught.message : t.t('error.recoverable'));
      setBusy(false);
    }
  };

  return (
    <>
      <MobileComputerGameSetup
        game={game}
        config={current}
        t={t}
        busy={busy}
        onChange={setConfig}
        onStart={() => void start()}
        onBack={() => router.push('/mobile')}
      />
      {error ? (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-xl bg-status-error px-4 py-3 text-center text-sm font-bold text-text-onBrand shadow-md">
          {error}
        </div>
      ) : null}
    </>
  );
}
