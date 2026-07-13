'use client';

import { LOCALES, type Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useEffect, useReducer, useRef } from 'react';

import { Button } from '../../../components/Button';
import { createCryptoRng, createSeededRng } from '../../../lib/computer-game/rng';
import { createTranslator } from '../../../lib/i18n';

import { LalSattiAccountPanel } from './LalSattiAccountPanel';
import {
  createLalSattiController,
  selectLalSattiViewState,
  type LalSattiController,
} from './controller';
import { LalSattiGameShell } from './immersive/LalSattiGameShell';
import type { LalSattiControllerState, LalSattiIntent, LalSattiRoundScore } from './types';

const PLAYER_COUNTS = [3, 4, 5, 6] as const;
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

export function LalSattiComputerGame(): ReactElement {
  const controllerRef = useRef<LalSattiController | null>(null);

  if (controllerRef.current === null) {
    const rng = seededRng();
    controllerRef.current = rng ? createLalSattiController(rng) : createLalSattiController();
  }

  const controller = controllerRef.current;
  const [state, dispatch] = useReducer(
    (current: LalSattiControllerState, intent: LalSattiIntent) =>
      controller.dispatch(current, intent),
    {
      ...controller.initialState,
      reducedMotion: prefersReducedMotion(),
    },
  );
  const view = selectLalSattiViewState(state);
  const t = createTranslator(view.locale);

  useEffect(() => {
    dispatch({ type: 'hydrateSession', ...readStoredSession() });
  }, []);

  useEffect(() => {
    writeStoredSession(state);
  }, [state]);

  useEffect(() => {
    if (view.phase !== 'playing' || view.isHumanTurn) return;
    const delay = view.reducedMotion ? 250 : 700;
    const timer = window.setTimeout(() => dispatch({ type: 'botStep' }), delay);
    return () => window.clearTimeout(timer);
  }, [view.phase, view.isHumanTurn, view.currentPlayerName, view.reducedMotion]);

  if (view.phase === 'setup') {
    return (
      <main className="min-h-screen bg-background-canvas px-4 py-6 text-text-primary">
        <section className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="rounded-lg bg-game-table p-5 text-text-onBrand shadow-md">
            <p className="text-sm font-semibold uppercase">{t.t('lalSatti.modeLabel')}</p>
            <h1 className="mt-2 text-3xl font-bold">{t.t('lalSatti.setupTitle')}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7">{t.t('lalSatti.setupDescription')}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
            <section className="rounded-lg bg-surface-primary p-4 shadow-md">
              <h2 className="text-lg font-bold text-action-primary">{t.t('lalSatti.tableSize')}</h2>
              <div className="mt-4 flex flex-wrap gap-2" aria-label={t.t('lalSatti.tableSize')}>
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

              <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-text-primary">
                {t.t('lalSatti.nameLabel')}
                <input
                  className="min-h-12 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
                  value={view.humanName}
                  maxLength={32}
                  placeholder={t.t('lalSatti.namePlaceholder')}
                  onChange={(event) =>
                    dispatch({ type: 'setHumanName', humanName: event.target.value })
                  }
                />
                <span className="text-xs font-normal leading-5 text-text-primary">
                  {t.t('lalSatti.nameHelp')}
                </span>
              </label>

              <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-text-primary">
                {t.t('settings.language')}
                <select
                  className="min-h-12 rounded-md border border-brand-accent bg-surface-primary px-3 py-2"
                  value={view.locale}
                  onChange={(event) =>
                    dispatch({ type: 'setLocale', locale: event.target.value as Locale })
                  }
                >
                  {LOCALES.map((locale) => (
                    <option key={locale} value={locale}>
                      {locale.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            </section>

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

            <LalSattiAccountPanel
              className="md:col-span-2"
              locale={view.locale}
              humanName={view.humanName}
              playerCount={view.playerCount}
              roundScores={view.roundScores}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" disabled={!view.canStart} onClick={() => dispatch({ type: 'start' })}>
              {t.t('lalSatti.startGame')}
            </Button>
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
      onLocaleChange={(next) => dispatch({ type: 'setLocale', locale: next })}
    />
  );
}
