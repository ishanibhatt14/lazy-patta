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
import { readLastConfig, writeLastConfig } from '../../lib/mobile/last-config';
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
  const startRef = useRef<(override?: ComputerGameConfig) => void>(() => {});
  const initial = useMemo(() => (game ? defaultComputerConfig(game) : null), [game]);
  const [config, setConfig] = useState<ComputerGameConfig | null>(initial);
  const quick = searchParams.get('quick') === '1';
  const seededRef = useRef(false);
  const quickStartedRef = useRef(false);

  // Seed the form from the last config this player confirmed for the game, so
  // reopening setup lands on their preferred table instead of the defaults.
  // Runs client-only (after hydration) to avoid an SSR/localStorage mismatch.
  useEffect(() => {
    if (!game || seededRef.current) return;
    seededRef.current = true;
    const remembered = readLastConfig(game.slug);
    if (remembered) setConfig((existing) => existing ?? remembered);
  }, [game]);

  useEffect(() => {
    if (!initial || typeof window === 'undefined' || !window.matchMedia) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) return;
    setConfig((existing) => {
      const next = existing ?? initial;
      return next.reducedMotion ? next : { ...next, reducedMotion: true };
    });
  }, [initial]);

  // Quick Play: launch straight from the tile with the remembered (or default)
  // table, honoring reduced motion. Guarded so it fires exactly once even if
  // the effect re-runs, and never competes with a manual start.
  useEffect(() => {
    if (!quick || quickStartedRef.current || !game) return;
    quickStartedRef.current = true;
    const base = readLastConfig(game.slug) ?? defaultComputerConfig(game);
    const reduced =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    startRef.current(reduced ? { ...base, reducedMotion: true } : base);
  }, [quick, game]);

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

  const start = async (override?: ComputerGameConfig): Promise<void> => {
    if (busy) return;
    const launchConfig = override ?? current;
    const requestId = requestRef.current ?? createClientRequestId();
    requestRef.current = requestId;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setBusy(true);
    setError(undefined);
    try {
      const session = await computerGameInitializer.start(
        launchConfig,
        requestId,
        abortRef.current.signal,
      );
      writeLastConfig(launchConfig);
      rememberRecentGame(game.slug);
      const nextRoute = game.routes.mobileComputer(session.sessionId);
      // Preserve the visual-regression query params (`seed` pins the deal,
      // `preview=result` opens straight on the celebration overlay) so the
      // screenshot shooter can drive the board deterministically.
      const forwarded = new URLSearchParams();
      const seed = searchParams.get('seed');
      if (seed !== null) forwarded.set('seed', seed);
      const preview = searchParams.get('preview');
      if (preview !== null) forwarded.set('preview', preview);
      const query = forwarded.toString();
      router.replace(query ? `${nextRoute}?${query}` : nextRoute);
    } catch (caught) {
      requestRef.current = null;
      setError(caught instanceof Error ? caught.message : t.t('error.recoverable'));
      setBusy(false);
    }
  };
  startRef.current = (override?: ComputerGameConfig) => void start(override);

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
