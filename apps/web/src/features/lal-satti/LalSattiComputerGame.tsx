'use client';

import type { BotDifficulty } from '@lazy-patta/game-contracts';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useEffect, useReducer, useRef } from 'react';

import { Button } from '../../../components/Button';
import { ComputerGameStarting } from '../../../components/game/ComputerGameStarting';
import { LocaleSwitcher } from '../../../components/game/LocaleSwitcher';
import { driveToResult, previewResultRequested } from '../../../lib/computer-game/preview-result';
import { createCryptoRng, createSeededRng } from '../../../lib/computer-game/rng';
import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';
import type { ComputerGameConfig } from '../../../lib/mobile/computer-session';

import {
  createLalSattiController,
  selectLalSattiViewState,
  type LalSattiController,
} from './controller';
import { LalSattiGameShell } from './immersive/LalSattiGameShell';
import type {
  LalSattiControllerState,
  LalSattiIntent,
  LalSattiRoundScore,
  LalSattiViewState,
} from './types';

const PLAYER_COUNTS = [3, 4, 5, 6] as const;
const DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];
const DIFFICULTY_LABEL_KEY: Record<
  BotDifficulty,
  'computer.difficultyEasy' | 'computer.difficultyMedium' | 'computer.difficultyHard'
> = {
  easy: 'computer.difficultyEasy',
  medium: 'computer.difficultyMedium',
  hard: 'computer.difficultyHard',
};
const SESSION_STORAGE_KEY = 'lazy-patta:lal-satti-session:v1';

interface StoredLalSattiSession {
  readonly humanName?: string;
  readonly roundScores?: readonly LalSattiRoundScore[];
}

function readStoredSession(): StoredLalSattiSession {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as StoredLalSattiSession;
    return {
      humanName: typeof parsed.humanName === 'string' ? parsed.humanName : undefined,
      roundScores: Array.isArray(parsed.roundScores) ? parsed.roundScores : undefined,
    };
  } catch {
    return {};
  }
}

function writeStoredSession(state: LalSattiControllerState): void {
  if (typeof window === 'undefined' || !state.hasHydratedSession) return;
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      humanName: state.humanName,
      roundScores: state.roundScores,
    }),
  );
}

/** A `?seed=` query param makes the deal reproducible for visual-regression
 * runs; without it every table shuffles from the crypto RNG. Presentation only —
 * the engine and reducer are untouched. */
function seededRng(): ReturnType<typeof createCryptoRng> | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null) return null;
  const seed = Number.parseInt(raw, 10);
  if (!Number.isFinite(seed)) return null;
  return createSeededRng(seed);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Auto-picks a legal move for the `?preview=result` screenshot seam: let bots
 * step, play the first playable card, and pass only when nothing is playable,
 * until the match ends.
 */
function pickPreviewIntent(view: LalSattiViewState): LalSattiIntent | null {
  if (view.phase === 'setup') return { type: 'start' };
  if (view.phase === 'playing') {
    if (!view.isHumanTurn) return { type: 'botStep' };
    const [cardId] = view.playableCardIds;
    if (cardId !== undefined) return { type: 'playCard', cardId };
    if (view.canPass) return { type: 'pass' };
  }
  return null;
}

export function LalSattiComputerGame({
  initialConfig,
  autoStart = false,
}: {
  readonly initialConfig?: ComputerGameConfig;
  readonly autoStart?: boolean;
} = {}): ReactElement {
  const { locale: preferredLocale, setLocale: setPreferredLocale } = usePreferredLocale();
  const controllerRef = useRef<LalSattiController | null>(null);
  const autoStartedRef = useRef(false);

  if (controllerRef.current === null) {
    const rng = seededRng();
    // Seeded runs (visual-regression) pin `hard` so bot play stays deterministic;
    // real players default to `medium` and can change it on the setup screen.
    controllerRef.current = createLalSattiController(
      rng ?? createCryptoRng(),
      preferredLocale,
      initialConfig?.difficulty ?? (rng ? 'hard' : 'medium'),
    );
  }

  const controller = controllerRef.current;
  const [state, dispatch] = useReducer(
    (current: LalSattiControllerState, intent: LalSattiIntent) =>
      controller.dispatch(current, intent),
    {
      ...controller.initialState,
      playerCount: initialConfig?.playerCount ?? controller.initialState.playerCount,
      humanName: initialConfig?.humanName ?? controller.initialState.humanName,
      difficulty: initialConfig?.difficulty ?? controller.initialState.difficulty,
      reducedMotion: initialConfig?.reducedMotion ?? prefersReducedMotion(),
      hasHydratedSession: initialConfig ? true : controller.initialState.hasHydratedSession,
    },
    (base) =>
      previewResultRequested()
        ? driveToResult({
            initialState: base,
            dispatch: controller.dispatch,
            selectView: selectLalSattiViewState,
            pickIntent: pickPreviewIntent,
            isResult: (view) => view.phase === 'result',
          })
        : base,
  );
  const view = selectLalSattiViewState(state);
  const t = createTranslator(view.locale);

  useEffect(() => {
    if (initialConfig) return;
    dispatch({ type: 'hydrateSession', ...readStoredSession() });
  }, [initialConfig]);

  useEffect(() => {
    writeStoredSession(state);
  }, [state]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || state.phase !== 'setup') return;
    autoStartedRef.current = true;
    dispatch({ type: 'start' });
  }, [autoStart, state.phase]);

  useEffect(() => {
    if (view.phase !== 'playing' || view.isHumanTurn) return;
    const delay = view.reducedMotion ? 250 : 700;
    const timer = window.setTimeout(() => dispatch({ type: 'botStep' }), delay);
    return () => window.clearTimeout(timer);
  }, [view.phase, view.isHumanTurn, view.currentPlayerName, view.reducedMotion]);

  if (view.phase === 'setup') {
    // Launched from the shared mobile setup shell, we auto-start into play; show
    // the same neutral placeholder as every game rather than this legacy setup.
    if (autoStart) return <ComputerGameStarting locale={view.locale} />;
    return (
      <main className="min-h-screen bg-background-canvas px-4 py-6 text-text-primary">
        <section className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-sm font-bold text-action-primary underline decoration-action-secondary decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              ← {t.t('lobby.backToGames')}
            </Link>
            <LocaleSwitcher
              locale={view.locale}
              onLocaleChange={(next) => {
                setPreferredLocale(next);
                dispatch({ type: 'setLocale', locale: next });
              }}
            />
          </div>

          <div className="rounded-lg bg-game-table p-5 text-text-onBrand shadow-md">
            <p className="text-sm font-semibold uppercase">{t.t('lalSatti.modeLabel')}</p>
            <h1 className="mt-2 text-3xl font-bold">{t.t('lalSatti.setupTitle')}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7">{t.t('lalSatti.setupDescription')}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <section className="rounded-lg bg-surface-primary p-4 shadow-md">
              <h2 className="text-lg font-bold text-action-primary">
                {t.t('lalSatti.quickRulesTitle')}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
                <li>{t.t('lalSatti.quickRuleSevens')}</li>
                <li>{t.t('lalSatti.quickRuleBuild')}</li>
                <li>{t.t('lalSatti.quickRulePass')}</li>
                <li>{t.t('lalSatti.quickRuleScoring')}</li>
              </ul>
            </section>

            <section className="rounded-lg bg-surface-primary p-4 shadow-md">
              <h2 className="text-lg font-bold text-action-primary">
                {t.t('lalSatti.quickGameTitle')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-primary">
                {t.format('lalSatti.quickGameSummary', {
                  name: view.humanName.trim() || t.t('computer.youName'),
                  count: view.playerCount,
                })}
              </p>
              <Button
                size="lg"
                className="mt-4 w-full min-h-12"
                onClick={() => dispatch({ type: 'start' })}
              >
                {t.t('lalSatti.startQuickGame')}
              </Button>

              <details className="mt-4 rounded-md border border-action-primary/20 bg-background-canvas p-3">
                <summary className="cursor-pointer text-sm font-bold text-action-primary">
                  {t.t('computer.customizeTable')}
                </summary>

                <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-text-primary">
                  {t.t('lalSatti.nameLabel')}
                  <input
                    className="min-h-12 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
                    value={view.humanName}
                    maxLength={32}
                    placeholder={t.t('computer.youName')}
                    onChange={(event) =>
                      dispatch({ type: 'setHumanName', humanName: event.target.value })
                    }
                  />
                  <span className="text-xs font-normal leading-5 text-text-primary">
                    {t.t('lalSatti.nameHelp')}
                  </span>
                </label>

                <div className="mt-4">
                  <h3 className="text-sm font-bold text-action-primary">
                    {t.t('lalSatti.tableSize')}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2" aria-label={t.t('lalSatti.tableSize')}>
                    {PLAYER_COUNTS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={[
                          'min-h-12 rounded-md border px-4 py-2 font-semibold transition',
                          view.playerCount === count
                            ? 'border-action-primary bg-action-primary text-text-onBrand'
                            : 'border-brand-accent bg-surface-primary text-text-primary',
                        ].join(' ')}
                        onClick={() => dispatch({ type: 'setPlayerCount', playerCount: count })}
                      >
                        {t.format('lobby.playerCount', { count })}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-bold text-action-primary">
                    {t.t('computer.difficultyLabel')}
                  </h3>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    role="group"
                    aria-label={t.t('computer.difficultyLabel')}
                  >
                    {DIFFICULTIES.map((level) => (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={view.difficulty === level}
                        className={[
                          'min-h-12 rounded-md border px-4 py-2 font-semibold transition',
                          view.difficulty === level
                            ? 'border-action-primary bg-action-primary text-text-onBrand'
                            : 'border-brand-accent bg-surface-primary text-text-primary',
                        ].join(' ')}
                        onClick={() => dispatch({ type: 'setDifficulty', difficulty: level })}
                      >
                        {t.t(DIFFICULTY_LABEL_KEY[level])}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-text-primary">
                    {t.t('computer.difficultyHelp')}
                  </p>
                </div>
              </details>
            </section>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              onClick={() => dispatch({ type: 'toggleReducedMotion' })}
              aria-pressed={view.reducedMotion}
            >
              {t.t('settings.reducedMotion')}
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <LalSattiGameShell
      view={view}
      locale={view.locale}
      onPlayCard={(cardId) => dispatch({ type: 'playCard', cardId })}
      onPass={() => dispatch({ type: 'pass' })}
      onRematch={() => dispatch({ type: 'rematch' })}
      onToggleReducedMotion={() => dispatch({ type: 'toggleReducedMotion' })}
      onLocaleChange={(next) => {
        setPreferredLocale(next);
        dispatch({ type: 'setLocale', locale: next });
      }}
    />
  );
}
