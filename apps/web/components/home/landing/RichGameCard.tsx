'use client';

import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';

import { createTranslator } from '../../../lib/i18n';
import { Button } from '../../Button';

interface RichGameCardProps {
  readonly locale: Locale;
  readonly title: string;
  readonly alias: string;
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

/**
 * Shared court-card palette so both game illustrations read as one system:
 * warm maroon, cream, peacock, and haldi.
 */
const ART = {
  maroon: '#7c2130',
  maroonDeep: '#5f1721',
  cream: '#fbf3de',
  creamShade: '#f0e2c2',
  peacock: '#127069',
  peacockDeep: '#0d514c',
  haldi: '#e8a93a',
  haldiSoft: '#f2c66b',
  ink: '#3a2416',
  tan: '#e7c49b',
} as const;

function FaceDownCard({ className = '' }: { readonly className?: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 120 168"
      width="120"
      height="168"
      className={className}
      style={{ overflow: 'visible' }}
      aria-hidden
      focusable="false"
    >
      <rect
        x="3"
        y="3"
        width="114"
        height="162"
        rx="12"
        fill={ART.maroon}
        stroke={ART.cream}
        strokeWidth="3"
      />
      <rect
        x="11"
        y="11"
        width="98"
        height="146"
        rx="8"
        fill="none"
        stroke={ART.haldi}
        strokeWidth="1.6"
        opacity="0.85"
      />
      <path
        d="M60 20 L84 60 L60 100 L36 60 Z M60 68 L84 108 L60 148 L36 108 Z"
        fill="none"
        stroke={ART.haldiSoft}
        strokeWidth="1.4"
        opacity="0.6"
      />
      <circle cx="60" cy="84" r="9" fill={ART.peacock} opacity="0.85" />
      <circle cx="60" cy="84" r="4" fill={ART.haldi} />
    </svg>
  );
}

function GulamFaceCard({ label }: { readonly label: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 120 168"
      width="120"
      height="168"
      className="h-full w-full"
      style={{ overflow: 'visible' }}
      aria-hidden
      focusable="false"
    >
      <defs>
        <filter id="lp-gulam-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#2a1a10" floodOpacity="0.4" />
        </filter>
      </defs>
      <rect
        x="2.5"
        y="2.5"
        width="115"
        height="163"
        rx="12"
        fill={ART.cream}
        stroke={ART.maroon}
        strokeWidth="3"
        filter="url(#lp-gulam-shadow)"
      />
      <rect
        x="8"
        y="8"
        width="104"
        height="152"
        rx="8"
        fill="none"
        stroke={ART.haldi}
        strokeWidth="1.4"
        opacity="0.75"
      />

      {/* Corner indices: J + spade, mirrored like a real court card */}
      <g fill={ART.maroon}>
        <text x="13" y="27" fontSize="19" fontWeight="800" fontFamily="Georgia, serif">
          J
        </text>
        <text x="14" y="41" fontSize="12">
          ♠
        </text>
        <g transform="rotate(180 60 84)">
          <text x="13" y="27" fontSize="19" fontWeight="800" fontFamily="Georgia, serif">
            J
          </text>
          <text x="14" y="41" fontSize="12">
            ♠
          </text>
        </g>
      </g>

      {/* Court figure: turbaned Gulam bust */}
      <g transform="translate(60 82)">
        <path d="M-26 40 Q-26 6 0 4 Q26 6 26 40 Z" fill={ART.maroon} />
        <path d="M-26 40 Q-26 6 0 4 Q26 6 26 40" fill="none" stroke={ART.haldi} strokeWidth="1.6" />
        <path d="M-13 8 Q0 20 13 8 L10 22 Q0 30 -10 22 Z" fill={ART.haldiSoft} />
        <ellipse
          cx="0"
          cy="-8"
          rx="15"
          ry="16.5"
          fill={ART.tan}
          stroke={ART.ink}
          strokeWidth="0.8"
        />
        {/* Turban */}
        <path d="M-17 -12 Q-20 -34 0 -35 Q20 -34 17 -12 Q0 -22 -17 -12 Z" fill={ART.haldi} />
        <path d="M-17 -12 Q0 -20 17 -12" fill="none" stroke={ART.peacock} strokeWidth="3" />
        <path d="M0 -35 Q6 -46 13 -44 Q9 -37 6 -33 Z" fill={ART.peacock} />
        <circle cx="0" cy="-24" r="2.6" fill={ART.maroonDeep} />
        {/* Face features */}
        <circle cx="-6" cy="-9" r="1.7" fill={ART.ink} />
        <circle cx="6" cy="-9" r="1.7" fill={ART.ink} />
        <path
          d="M-8 -1 Q0 3 8 -1"
          fill="none"
          stroke={ART.ink}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M-9 2 Q-4 6 0 4 Q4 6 9 2"
          fill="none"
          stroke={ART.ink}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>

      {/* Localized label ribbon */}
      <g>
        <rect x="26" y="140" width="68" height="18" rx="9" fill={ART.maroon} />
        <text
          x="60"
          y="153"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
          fill={ART.cream}
          fontFamily="Georgia, serif"
        >
          {label}
        </text>
      </g>
    </svg>
  );
}

function GadhaMascot({ className = '' }: { readonly className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 90 90" width="90" height="90" className={className} aria-hidden focusable="false">
      {/* Ears */}
      <ellipse cx="30" cy="20" rx="8" ry="20" fill="#9c9691" transform="rotate(-16 30 20)" />
      <ellipse cx="60" cy="20" rx="8" ry="20" fill="#9c9691" transform="rotate(16 60 20)" />
      <ellipse cx="30" cy="22" rx="4" ry="13" fill="#c9b7ce" transform="rotate(-16 30 22)" />
      <ellipse cx="60" cy="22" rx="4" ry="13" fill="#c9b7ce" transform="rotate(16 60 22)" />
      {/* Head */}
      <ellipse cx="45" cy="48" rx="26" ry="24" fill="#b3ada8" />
      <ellipse cx="45" cy="62" rx="16" ry="14" fill="#d8d2cc" />
      {/* Eyes */}
      <circle cx="35" cy="44" r="3.4" fill={ART.ink} />
      <circle cx="55" cy="44" r="3.4" fill={ART.ink} />
      <circle cx="36" cy="43" r="1.1" fill={ART.cream} />
      <circle cx="56" cy="43" r="1.1" fill={ART.cream} />
      {/* Nostrils + smile */}
      <ellipse cx="39" cy="62" rx="2.2" ry="3" fill={ART.ink} />
      <ellipse cx="51" cy="62" rx="2.2" ry="3" fill={ART.ink} />
      <path
        d="M38 70 Q45 74 52 70"
        fill="none"
        stroke={ART.ink}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Forelock */}
      <path d="M45 24 Q40 30 44 34 Q48 30 45 24" fill="#8a847f" />
    </svg>
  );
}

export function GadhaChorArtwork({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-t-lg"
      role="img"
      aria-label={t('landing.game.gadhaChor.artLabel')}
    >
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background: `radial-gradient(120% 120% at 18% 12%, ${ART.haldiSoft} 0%, ${ART.haldi} 34%, ${ART.maroon} 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-25"
        aria-hidden
        style={{
          background: `radial-gradient(circle, ${ART.cream} 0 1px, transparent 2px) 0 0 / 18px 18px`,
        }}
      />
      {/* Face-down fan */}
      <div className="art-fan absolute bottom-3 left-[10%] top-6 w-[34%]">
        <FaceDownCard className="absolute left-0 top-2 h-[86%] w-auto -rotate-[14deg]" />
        <FaceDownCard className="absolute left-5 top-0 h-[92%] w-auto -rotate-[6deg]" />
      </div>
      {/* Gulam card */}
      <div className="art-gulam absolute bottom-4 left-[34%] top-4 w-[36%]">
        <GulamFaceCard label={t('landing.game.gadhaChor.cardLabel')} />
      </div>
      {/* Mascot peeking from behind the unmatched card */}
      <GadhaMascot className="art-mascot absolute bottom-6 right-[8%] h-[42%] w-auto" />
    </div>
  );
}

function HeartCard({
  rank,
  className = '',
  featured = false,
}: {
  readonly rank: string;
  readonly className?: string;
  readonly featured?: boolean;
}): ReactElement {
  const pips: Record<string, ReadonlyArray<readonly [number, number]>> = {
    '6': [
      [40, 42],
      [80, 42],
      [40, 84],
      [80, 84],
      [40, 126],
      [80, 126],
    ],
    '7': [
      [40, 40],
      [80, 40],
      [60, 62],
      [40, 84],
      [80, 84],
      [40, 128],
      [80, 128],
    ],
    '8': [
      [40, 38],
      [80, 38],
      [40, 70],
      [80, 70],
      [40, 98],
      [80, 98],
      [40, 130],
      [80, 130],
    ],
  };
  const heart = 'M0 4 C-5 -4 -16 -3 -16 6 C-16 14 -6 19 0 25 C6 19 16 14 16 6 C16 -3 5 -4 0 4 Z';
  return (
    <svg
      viewBox="0 0 120 168"
      width="120"
      height="168"
      className={className}
      style={{ overflow: 'visible' }}
      aria-hidden
      focusable="false"
    >
      <defs>
        <filter id={`lp-heart-shadow-${rank}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#2a1a10" floodOpacity="0.4" />
        </filter>
      </defs>
      <rect
        x="2.5"
        y="2.5"
        width="115"
        height="163"
        rx="12"
        fill={ART.cream}
        stroke={featured ? ART.haldi : ART.maroon}
        strokeWidth={featured ? '3.4' : '2.6'}
        filter={`url(#lp-heart-shadow-${rank})`}
      />
      <rect
        x="8"
        y="8"
        width="104"
        height="152"
        rx="8"
        fill="none"
        stroke={ART.creamShade}
        strokeWidth="1.2"
      />
      <g fill="#c0392b">
        <text x="12" y="26" fontSize="18" fontWeight="800" fontFamily="Georgia, serif">
          {rank}
        </text>
        <text x="13" y="40" fontSize="12">
          ♥
        </text>
        <g transform="rotate(180 60 84)">
          <text x="12" y="26" fontSize="18" fontWeight="800" fontFamily="Georgia, serif">
            {rank}
          </text>
          <text x="13" y="40" fontSize="12">
            ♥
          </text>
        </g>
        {pips[rank]?.map(([cx, cy], index) => (
          <path key={`${cx}-${cy}-${index}`} d={heart} transform={`translate(${cx} ${cy - 8})`} />
        ))}
      </g>
    </svg>
  );
}

export function LalSattiArtwork({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-t-lg"
      role="img"
      aria-label={t('landing.game.lalSatti.artLabel')}
    >
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background: `radial-gradient(120% 130% at 82% 8%, ${ART.peacock} 0%, ${ART.peacockDeep} 46%, ${ART.maroonDeep} 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        aria-hidden
        style={{
          background: `radial-gradient(circle, ${ART.haldiSoft} 0 1px, transparent 2px) 0 0 / 20px 20px`,
        }}
      />
      <div className="absolute inset-x-0 bottom-4 top-6 flex items-end justify-center gap-2">
        <HeartCard rank="6" className="art-slide-left art-lift h-[62%] w-auto" />
        <HeartCard rank="7" featured className="h-[80%] w-auto" />
        <HeartCard rank="8" className="art-slide-right art-lift h-[62%] w-auto" />
      </div>
    </div>
  );
}

export function RichGameCard({
  locale,
  title,
  alias,
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
            <p className="mt-1 text-xs font-black uppercase tracking-wide text-brand-accent">
              {alias}
            </p>
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

        <div className="mt-auto flex flex-col gap-3">
          <Link
            href={onlineHref}
            className="inline-flex min-h-14 flex-col items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-bold text-text-onBrand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            <span>{t('landing.game.startFamilyRoom')}</span>
            <span className="text-xs font-semibold opacity-90">{t('landing.game.familyHint')}</span>
          </Link>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href={computerHref}
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary px-4 text-sm font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {t('landing.game.practice')}
            </Link>
            <Button variant="ghost" size="sm" className="min-h-12" onClick={onHowToPlay}>
              {t('landing.game.learnRules')}
            </Button>
          </div>
          <Link
            href={overviewHref}
            className="text-center text-xs font-bold text-text-primary underline decoration-action-secondary decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {t('landing.game.overview')}
          </Link>
        </div>
      </div>
    </article>
  );
}
