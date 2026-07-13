'use client';

import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';

import { createTranslator } from '../../../lib/i18n';
import { Button } from '../../Button';

interface RichGameCardProps {
  readonly locale: Locale;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly difficulty: string;
  readonly duration: string;
  readonly players: string;
  readonly computerHref: string;
  readonly onlineHref: string;
  readonly overviewHref: string;
  readonly onHowToPlay: () => void;
  readonly artwork: ReactNode;
}

export function GadhaChorArtwork(): ReactElement {
  return (
    <div className="relative min-h-48 overflow-hidden rounded-lg bg-scene-rim p-4 text-text-onBrand">
      <div className="absolute inset-0 bg-action-secondary/10" />
      <div className="absolute left-5 top-5 flex -space-x-3">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className="art-lift h-24 w-16 rounded-md border border-action-secondary/50 bg-card-back shadow-lg"
          />
        ))}
      </div>
      <div className="absolute bottom-5 right-5 grid h-24 w-24 place-items-center rounded-full border-4 border-action-secondary bg-scene-rimEdge shadow-xl">
        <span className="text-3xl font-black">G</span>
      </div>
      <div className="absolute bottom-8 left-6 rounded-full bg-surface-primary px-3 py-2 text-sm font-bold text-action-primary">
        J ?
      </div>
    </div>
  );
}

export function LalSattiArtwork(): ReactElement {
  return (
    <div className="relative min-h-48 overflow-hidden rounded-lg bg-accent-indigo p-4 text-text-onBrand">
      <div className="absolute inset-0 bg-scene-skyTop/30" />
      <div className="absolute inset-x-8 top-12 h-1 rounded-full bg-action-secondary/70" />
      <div className="absolute inset-x-12 bottom-12 h-1 rounded-full bg-brand-accent/70" />
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-end gap-2">
        <div className="art-slide-left art-lift flex h-24 w-16 flex-col justify-between rounded-lg bg-card-face p-2 text-card-suitRed shadow-lg">
          <span>6</span>
          <span className="self-center text-2xl">♥</span>
        </div>
        <div className="z-10 flex h-32 w-20 flex-col justify-between rounded-lg border-2 border-action-secondary bg-card-face p-2 text-card-suitRed shadow-xl">
          <span>7</span>
          <span className="self-center text-3xl">♥</span>
          <span className="self-end rotate-180">7</span>
        </div>
        <div className="art-slide-right art-lift flex h-24 w-16 flex-col justify-between rounded-lg bg-card-face p-2 text-card-suitRed shadow-lg">
          <span>8</span>
          <span className="self-center text-2xl">♥</span>
        </div>
      </div>
    </div>
  );
}

export function RichGameCard({
  locale,
  title,
  description,
  status,
  difficulty,
  duration,
  players,
  computerHref,
  onlineHref,
  overviewHref,
  onHowToPlay,
  artwork,
}: RichGameCardProps): ReactElement {
  const { t } = createTranslator(locale);
  const meta = [difficulty, duration, players];

  return (
    <article className="rich-game-card flex min-h-full flex-col overflow-hidden rounded-lg border border-action-primary/15 bg-surface-primary shadow-md">
      {artwork}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-action-primary">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-text-primary">{description}</p>
          </div>
          <span className="rounded-full bg-brand-accent/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-brand-accent">
            {status}
          </span>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-text-primary">
          {meta.map((item) => (
            <div key={item} className="rounded-md bg-background-canvas px-2 py-2">
              <dt className="sr-only">{item}</dt>
              <dd>{item}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto grid gap-2 sm:grid-cols-2">
          <Link
            href={computerHref}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-action-primary px-4 text-sm font-bold text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('action.playComputer')}
          </Link>
          <Link
            href={onlineHref}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary px-4 text-sm font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('action.playOnline')}
          </Link>
          <Link
            href={overviewHref}
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary/30 px-4 text-sm font-bold text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('landing.game.overview')}
          </Link>
          <Button variant="ghost" size="sm" className="min-h-12" onClick={onHowToPlay}>
            {t('action.howToPlay')}
          </Button>
        </div>
      </div>
    </article>
  );
}
