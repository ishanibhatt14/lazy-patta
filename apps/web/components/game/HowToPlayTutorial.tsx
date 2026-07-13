'use client';

import type { Locale, MessageKey } from '@lazy-patta/localization';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { createTranslator } from '../../lib/i18n';
import { Button } from '../Button';

export interface TutorialStep {
  readonly icon: string;
  readonly titleKey: MessageKey;
  readonly bodyKey: MessageKey;
}

interface HowToPlayTutorialProps {
  readonly locale: Locale;
  readonly onClose: () => void;
  /** Defaults to the Gadha Chor steps; pass a different set for other games. */
  readonly steps?: readonly TutorialStep[];
}

/** Gadha Chor's default tutorial content (the original, only game for a while). */
export const GADHA_CHOR_TUTORIAL_STEPS: readonly TutorialStep[] = [
  { icon: '🃏', titleKey: 'tutorial.pairsTitle', bodyKey: 'tutorial.pairsBody' },
  { icon: '👆', titleKey: 'tutorial.drawTitle', bodyKey: 'tutorial.drawBody' },
  { icon: '✨', titleKey: 'tutorial.autoPairTitle', bodyKey: 'tutorial.autoPairBody' },
  { icon: '🪔', titleKey: 'tutorial.gadhaChorTitle', bodyKey: 'tutorial.gadhaChorBody' },
];

export function HowToPlayTutorial({
  locale,
  onClose,
  steps = GADHA_CHOR_TUTORIAL_STEPS,
}: HowToPlayTutorialProps): ReactElement {
  const { t, format } = createTranslator(locale);
  const [index, setIndex] = useState(0);
  const step = steps[index]!;
  const isLast = index === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-game-table/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('action.howToPlay')}
    >
      <div className="flex w-full max-w-md flex-col gap-5 rounded-lg bg-surface-primary p-6 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-accent">
            {format('tutorial.progress', { step: index + 1, total: steps.length })}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 min-w-12 rounded-md px-3 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('action.skip')}
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <span aria-hidden className="text-4xl">
            {step.icon}
          </span>
          <h2 className="text-2xl font-bold text-action-primary">{t(step.titleKey)}</h2>
          <p className="text-base leading-7 text-text-primary">{t(step.bodyKey)}</p>
        </div>

        <div className="flex items-center justify-center gap-2" aria-hidden>
          {steps.map((entry, dotIndex) => (
            <span
              key={entry.titleKey}
              className={[
                'h-2.5 w-2.5 rounded-full',
                dotIndex === index ? 'bg-action-primary' : 'bg-background-canvas',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="ghost"
            className="min-h-12 bg-background-canvas"
            disabled={index === 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
          >
            {t('action.back')}
          </Button>
          {isLast ? (
            <Button className="min-h-12" onClick={onClose}>
              {t('action.gotIt')}
            </Button>
          ) : (
            <Button className="min-h-12" onClick={() => setIndex((current) => current + 1)}>
              {t('action.next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
