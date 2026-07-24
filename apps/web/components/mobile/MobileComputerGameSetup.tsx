'use client';

import { defaultPresetFor, presetsFor, type BotDifficulty } from '@lazy-patta/game-contracts';
import type { MessageKey } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import type { ComputerGameConfig } from '../../lib/mobile/computer-session';
import {
  type GameDefinition,
  type GameSlug,
  isValidPlayerCount,
} from '../../lib/mobile/game-registry';
import { Button } from '../Button';
import { LandingLanguageMenu } from '../home/landing/LandingLanguageMenu';

import { PatternBackground } from './artwork/PatternBackground';
import { CheckIcon } from './icons';

const DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'medium', 'hard'];
// Setup speaks in feel, not bot internals: Relaxed / Balanced / Sharp, each with
// a one-line "what this table is like". The underlying BotDifficulty is unchanged.
const SETUP_DIFFICULTY: Record<BotDifficulty, { label: MessageKey; hint: MessageKey }> = {
  easy: {
    label: 'mobile.setup.difficulty.relaxed',
    hint: 'mobile.setup.difficulty.relaxedHint',
  },
  medium: {
    label: 'mobile.setup.difficulty.balanced',
    hint: 'mobile.setup.difficulty.balancedHint',
  },
  hard: {
    label: 'mobile.setup.difficulty.sharp',
    hint: 'mobile.setup.difficulty.sharpHint',
  },
};

function playerCounts(game: GameDefinition): readonly number[] {
  return Array.from(
    { length: game.players.max - game.players.min + 1 },
    (_, index) => game.players.min + index,
  );
}

export function defaultComputerConfig(game: GameDefinition): ComputerGameConfig {
  return {
    gameSlug: game.slug,
    humanName: '',
    playerCount: game.players.defaultComputer,
    difficulty: game.computerOptions.defaultDifficulty,
    reducedMotion: false,
    confirmBeforePlay: false,
    presetId: defaultPresetFor(game.slug).id,
  };
}

export function MobileComputerGameSetup({
  game,
  config,
  t,
  busy,
  onChange,
  onStart,
  onBack,
}: {
  readonly game: GameDefinition;
  readonly config: ComputerGameConfig;
  readonly t: Translator;
  readonly busy: boolean;
  readonly onChange: (config: ComputerGameConfig) => void;
  readonly onStart: () => void;
  readonly onBack: () => void;
}): ReactElement {
  const valid = config.gameSlug === game.slug && isValidPlayerCount(game, config.playerCount);
  const title = t.format('mobile.setup.title', { name: t.t(game.localization.nameKey) });
  const presets = presetsFor(game.slug);
  const activePresetId = config.presetId ?? defaultPresetFor(game.slug).id;

  return (
    <main className="flex min-h-[calc(100dvh-7rem)] flex-col justify-between gap-5">
      {/* The setup happens "at the table": a felt mat with a warm panel floating
          on it, so choosing players and difficulty feels like sitting down to
          play rather than filling in a form. */}
      <section className="relative overflow-hidden rounded-3xl bg-game-table p-3 shadow-md">
        <PatternBackground className="text-text-onAccent" opacity={0.06} />
        <div className="relative z-10 flex flex-col gap-5 rounded-2xl border border-action-primary/10 bg-surface-primary px-4 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-brand-accent">
                {t.t('action.playComputer')}
              </p>
              <h1 className="text-2xl font-black leading-tight text-action-primary">{title}</h1>
            </div>
            <LandingLanguageMenu />
          </div>
          <p className="text-sm leading-6 text-text-primary/85">
            {t.t(game.localization.descriptionKey)}
          </p>

          <div className="grid gap-5">
            {presets.length > 1 ? (
              <fieldset className="grid gap-2">
                <legend className="text-sm font-black text-action-primary">
                  {t.t('houseRules.pickerLabel')}
                </legend>
                <div className="grid gap-2" role="group">
                  {presets.map((preset) => {
                    const selected = preset.id === activePresetId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={selected}
                        className={[
                          'grid gap-1 rounded-xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                          selected
                            ? 'border-action-primary bg-action-primary text-text-onBrand'
                            : 'border-action-primary/25 bg-background-canvas text-action-primary',
                        ].join(' ')}
                        onClick={() => onChange({ ...config, presetId: preset.id })}
                      >
                        <span className="text-sm font-black">
                          {t.t(preset.labelKey as MessageKey)}
                        </span>
                        <span
                          className={[
                            'text-xs leading-5',
                            selected ? 'text-text-onBrand/85' : 'text-text-primary/75',
                          ].join(' ')}
                        >
                          {t.t(preset.descriptionKey as MessageKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="grid gap-2">
              <legend className="text-sm font-black text-action-primary">
                {t.t('computer.playerCount')}
              </legend>
              <div className="grid grid-cols-3 gap-2" role="group">
                {playerCounts(game).map((count) => {
                  const selected = config.playerCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={selected}
                      className={[
                        'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                        selected
                          ? 'border-action-primary bg-action-primary text-text-onBrand'
                          : 'border-action-primary/25 bg-background-canvas text-action-primary',
                      ].join(' ')}
                      onClick={() => onChange({ ...config, playerCount: count })}
                    >
                      <SeatDots count={count} selected={selected} />
                      <span className="text-base font-black leading-none">{count}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {game.computerOptions.supportsDifficulty ? (
              <fieldset className="grid gap-2">
                <legend className="text-sm font-black text-action-primary">
                  {t.t('computer.difficultyLabel')}
                </legend>
                <div className="grid gap-2" role="group">
                  {DIFFICULTIES.map((difficulty) => {
                    const selected = config.difficulty === difficulty;
                    const meta = SETUP_DIFFICULTY[difficulty];
                    return (
                      <button
                        key={difficulty}
                        type="button"
                        aria-pressed={selected}
                        className={[
                          'grid gap-1 rounded-xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
                          selected
                            ? 'border-action-primary bg-action-primary text-text-onBrand'
                            : 'border-action-primary/25 bg-background-canvas text-action-primary',
                        ].join(' ')}
                        onClick={() => onChange({ ...config, difficulty })}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black">{t.t(meta.label)}</span>
                          {selected ? (
                            <CheckIcon aria-hidden width={18} height={18} className="shrink-0" />
                          ) : null}
                        </span>
                        <span
                          className={[
                            'text-xs leading-5',
                            selected ? 'text-text-onBrand/85' : 'text-text-primary/75',
                          ].join(' ')}
                        >
                          {t.t(meta.hint)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="grid gap-2">
              <legend className="text-sm font-black text-action-primary">
                {t.t('mobile.setup.accessibility')}
              </legend>
              <ToggleRow
                label={t.t('settings.reducedMotion')}
                on={config.reducedMotion}
                onLabel={t.t('settings.on')}
                offLabel={t.t('settings.off')}
                onToggle={() => onChange({ ...config, reducedMotion: !config.reducedMotion })}
              />
              <ToggleRow
                label={t.t('settings.confirmBeforePlay')}
                hint={t.t('settings.confirmBeforePlayHint')}
                on={config.confirmBeforePlay}
                onLabel={t.t('settings.on')}
                offLabel={t.t('settings.off')}
                onToggle={() =>
                  onChange({ ...config, confirmBeforePlay: !config.confirmBeforePlay })
                }
              />
            </fieldset>
          </div>
        </div>
      </section>

      {/* Sticky "Deal the cards" — the commit action stays reachable above the
          safe-area no matter how tall the table options grow. */}
      <nav className="sticky bottom-0 z-10 grid gap-2 bg-background-canvas/90 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur">
        <Button size="lg" className="min-h-14 w-full" disabled={busy || !valid} onClick={onStart}>
          {busy ? t.t('rooms.starting') : t.t('mobile.setup.deal')}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="min-h-12" onClick={onBack} disabled={busy}>
            {t.t('action.backToGames')}
          </Button>
          <Link
            href={game.routes.rules}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary px-4 py-2.5 text-base font-semibold text-action-primary transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t.t('action.howToPlay')}
          </Link>
        </div>
      </nav>
    </main>
  );
}

/**
 * A little cluster of seat dots that grows with the player count, so each option
 * reads as "a table this size" at a glance. Purely decorative (`aria-hidden`):
 * the button's number is the accessible label.
 */
function SeatDots({
  count,
  selected,
}: {
  readonly count: number;
  readonly selected: boolean;
}): ReactElement {
  const dots = Math.min(count, 5);
  return (
    <span aria-hidden className="flex -space-x-1">
      {Array.from({ length: dots }, (_, index) => (
        <span
          key={index}
          className={[
            'h-3 w-3 rounded-full border',
            selected
              ? 'border-action-primary bg-text-onBrand/85'
              : 'border-surface-primary bg-action-primary/35',
          ].join(' ')}
        />
      ))}
    </span>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onLabel,
  offLabel,
  onToggle,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly on: boolean;
  readonly onLabel: string;
  readonly offLabel: string;
  readonly onToggle: () => void;
}): ReactElement {
  return (
    <div className="grid gap-1">
      <button
        type="button"
        aria-pressed={on}
        onClick={onToggle}
        className={[
          'flex min-h-12 items-center justify-between rounded-xl border px-4 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent',
          on
            ? 'border-action-primary bg-action-primary text-text-onBrand'
            : 'border-action-primary/25 bg-background-canvas text-action-primary',
        ].join(' ')}
      >
        <span>{label}</span>
        <span>{on ? onLabel : offLabel}</span>
      </button>
      {hint ? <p className="text-xs leading-5 text-text-primary/75">{hint}</p> : null}
    </div>
  );
}

export function setupRouteFor(slug: GameSlug): string {
  return `/mobile/game/${slug}/setup?mode=computer`;
}
