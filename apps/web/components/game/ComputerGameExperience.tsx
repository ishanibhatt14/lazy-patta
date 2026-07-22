'use client';

import type { ReactElement } from 'react';
import { useEffect, useReducer, useRef, useState } from 'react';

import {
  createComputerGameController,
  type ComputerGameController,
  type ControllerState,
} from '../../lib/computer-game/controller';
import { botDelay, pacingFor } from '../../lib/computer-game/pacing';
import { HUMAN_ID } from '../../lib/computer-game/players';
import { createCryptoRng, createSeededRng } from '../../lib/computer-game/rng';
import type { ComputerGameIntent } from '../../lib/computer-game/types';
import { selectViewState } from '../../lib/computer-game/view-model';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import type { ComputerGameConfig } from '../../lib/mobile/computer-session';
import { playCue } from '../../lib/sound';

import { ComputerGameSetup } from './ComputerGameSetup';
import { ComputerGameStarting } from './ComputerGameStarting';
import { GameErrorBoundary } from './GameErrorBoundary';
import { HowToPlayTutorial } from './HowToPlayTutorial';
import { ImmersiveGameShell } from './immersive/ImmersiveGameShell';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** A `?seed=` query param makes the deal reproducible for visual-regression
 * tests; production play always uses crypto randomness. */
function seededRngFactory(): (() => ReturnType<typeof createCryptoRng>) | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null) return null;
  const seed = Number.parseInt(raw, 10);
  if (!Number.isFinite(seed)) return null;
  return () => createSeededRng(seed);
}

export function ComputerGameExperience({
  initialConfig,
  autoStart = false,
}: {
  readonly initialConfig?: ComputerGameConfig;
  readonly autoStart?: boolean;
} = {}): ReactElement {
  const { locale: preferredLocale, setLocale: setPreferredLocale } = usePreferredLocale();
  const rngFactoryRef = useRef<() => ReturnType<typeof createCryptoRng>>(
    seededRngFactory() ?? createCryptoRng,
  );
  const controllerRef = useRef<ComputerGameController | null>(null);
  const pacingRngRef = useRef(rngFactoryRef.current());
  const startedRef = useRef(false);
  const autoStartedRef = useRef(false);
  const lastDrawSeqRef = useRef<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  if (controllerRef.current === null) {
    controllerRef.current = createComputerGameController(rngFactoryRef.current(), {
      playerCount: initialConfig?.playerCount ?? 4,
      locale: preferredLocale,
      reducedMotion: initialConfig?.reducedMotion ?? prefersReducedMotion(),
      soundEnabled: true,
    });
  }
  const controller = controllerRef.current;

  const [state, dispatch] = useReducer(
    (current: ControllerState, intent: ComputerGameIntent) => controller.dispatch(current, intent),
    controller.initialState,
  );

  const view = selectViewState(state);
  const { reducedMotion, soundEnabled, locale } = state.settings;
  const pacing = pacingFor(reducedMotion);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || state.phase !== 'setup') return;
    autoStartedRef.current = true;
    dispatch({ type: 'start' });
  }, [autoStart, state.phase]);

  // Intro sequence: dealing → initial pairs → play. Timed presentation only.
  useEffect(() => {
    if (state.phase !== 'dealing' && state.phase !== 'initialPairs') return;
    const delay = state.phase === 'dealing' ? pacing.dealMs : pacing.initialPairsMs;
    const timer = window.setTimeout(() => dispatch({ type: 'introAdvance' }), delay);
    return () => window.clearTimeout(timer);
  }, [state.phase, pacing.dealMs, pacing.initialPairsMs]);

  // Clear the draw reveal after it has been shown, then continue the round.
  useEffect(() => {
    if (!state.draw) return;
    const delay = state.draw.pairRemoved ? pacing.pairRevealMs : pacing.drawRevealMs;
    const timer = window.setTimeout(() => dispatch({ type: 'clearDraw' }), delay);
    return () => window.clearTimeout(timer);
  }, [state.draw, pacing.drawRevealMs, pacing.pairRevealMs]);

  // Schedule the next bot turn with humanized pacing.
  useEffect(() => {
    if (state.phase !== 'playing' || state.draw || !state.game) return;
    const currentId = state.game.players[state.game.currentPlayerIndex]?.id;
    if (!currentId || currentId === HUMAN_ID) return;
    const timer = window.setTimeout(
      () => dispatch({ type: 'botStep' }),
      botDelay(pacing, pacingRngRef.current),
    );
    return () => window.clearTimeout(timer);
  }, [state.phase, state.draw, state.game, pacing]);

  // Sound cues — secondary, muted via settings, always paired with visible state.
  useEffect(() => {
    if (state.phase === 'dealing') {
      startedRef.current = true;
      playCue('deal', soundEnabled);
    }
    if (state.phase === 'result') playCue('result', soundEnabled);
  }, [state.phase, soundEnabled]);

  useEffect(() => {
    if (!state.draw || !startedRef.current) return;
    const key = `${state.seq}`;
    if (lastDrawSeqRef.current === key) return;
    lastDrawSeqRef.current = key;
    playCue(state.draw.pairRemoved ? 'pair' : 'draw', soundEnabled);
  }, [state.draw, state.seq, soundEnabled]);

  const tutorial = tutorialOpen ? (
    <HowToPlayTutorial locale={locale} onClose={() => setTutorialOpen(false)} />
  ) : null;

  if (state.phase === 'setup') {
    // Launched from the shared mobile setup shell, we auto-start into play; show
    // the same neutral placeholder as every game rather than this setup surface.
    if (autoStart) return <ComputerGameStarting locale={locale} />;
    return (
      <>
        <ComputerGameSetup
          view={view}
          onPlayerCountChange={(playerCount) => dispatch({ type: 'setPlayerCount', playerCount })}
          onLocaleChange={(next) => {
            setPreferredLocale(next);
            dispatch({ type: 'setLocale', locale: next });
          }}
          onStart={() => dispatch({ type: 'start' })}
          onHowToPlay={() => setTutorialOpen(true)}
        />
        {tutorial}
      </>
    );
  }

  const boundaryText = createTranslator(locale);

  return (
    <GameErrorBoundary
      fallback={(reset) => (
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-lg font-semibold text-status-error">
            {boundaryText.t('error.recoverable')}
          </p>
          <button
            type="button"
            className="min-h-12 rounded-md bg-action-primary px-5 py-2.5 font-semibold text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            onClick={() => {
              reset();
              dispatch({ type: 'recover' });
            }}
          >
            {boundaryText.t('action.returnToSetup')}
          </button>
        </main>
      )}
    >
      <ImmersiveGameShell
        view={view}
        locale={locale}
        onChooseCard={(positionToken) => dispatch({ type: 'chooseHiddenCard', positionToken })}
        onRematch={() => dispatch({ type: 'rematch' })}
        onRecover={() => dispatch({ type: 'recover' })}
        onToggleSound={() => dispatch({ type: 'toggleSound' })}
        onToggleReducedMotion={() => dispatch({ type: 'toggleReducedMotion' })}
        onLocaleChange={(next) => {
          setPreferredLocale(next);
          dispatch({ type: 'setLocale', locale: next });
        }}
        onHowToPlay={() => setTutorialOpen(true)}
        initialConfirmBeforePlay={initialConfig?.confirmBeforePlay ?? false}
      />
      {tutorial}
    </GameErrorBoundary>
  );
}
