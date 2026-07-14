'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';

import { LandingFooter } from './landing/LandingFooter';
import { LandingShell } from './landing/LandingShell';

interface PhonePreviewProps {
  readonly guestLabel: string;
  readonly readyLabel: string;
  readonly tableLabel: string;
  readonly roomLabel: string;
  readonly noDownloadLabel: string;
  readonly gadhaChorLabel: string;
  readonly lalSattiLabel: string;
  readonly playLabel: string;
  readonly joinLabel: string;
}

function PhonePreview({
  guestLabel,
  readyLabel,
  tableLabel,
  roomLabel,
  noDownloadLabel,
  gadhaChorLabel,
  lalSattiLabel,
  playLabel,
  joinLabel,
}: PhonePreviewProps): ReactElement {
  const previewCards = [
    { rank: 'A', suit: '♥', pose: '-rotate-12 -translate-x-14 -translate-y-4' },
    { rank: '7', suit: '♥', pose: 'rotate-1 -translate-y-5' },
    { rank: 'K', suit: '♠', pose: 'rotate-12 translate-x-14 -translate-y-4' },
  ];

  return (
    <div
      className="relative mx-auto flex aspect-[9/16] w-full max-w-xs flex-col overflow-hidden rounded-[2rem] border border-action-primary/20 bg-surface-primary p-4 shadow-2xl"
      aria-hidden="true"
    >
      <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-action-primary/20" />
      <div className="flex items-center justify-between">
        <Image
          src="/images/lazy-patta-logo-transparent.png"
          alt=""
          width={72}
          height={72}
          className="h-16 w-16 object-contain"
        />
        <div className="rounded-full bg-action-secondary/20 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-action-primary">
          {guestLabel}
        </div>
      </div>
      <div className="mt-5 grid flex-1 grid-rows-[auto_auto_1fr_auto] gap-3 rounded-2xl bg-background-canvas p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-accent">
              {readyLabel}
            </p>
            <p className="mt-1 text-lg font-black text-action-primary">{tableLabel}</p>
          </div>
          <div className="rounded-md bg-surface-primary px-2 py-1 text-right shadow-sm">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-text-primary">
              {roomLabel}
            </p>
            <p className="text-sm font-black text-action-primary">LP57</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[gadhaChorLabel, lalSattiLabel].map((game) => (
            <div key={game} className="rounded-md bg-surface-primary p-2 shadow-sm">
              <div className="mb-2 h-2 w-10 rounded-full bg-brand-accent/70" />
              <p className="text-xs font-black leading-tight text-action-primary">{game}</p>
            </div>
          ))}
        </div>

        <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-xl border border-action-primary/10 bg-surface-primary/75">
          <div className="absolute left-3 top-3 flex gap-1">
            {['B', 'K', 'M'].map((initial) => (
              <span
                key={initial}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-action-secondary/30 text-xs font-black text-action-primary"
              >
                {initial}
              </span>
            ))}
          </div>
          <div className="absolute right-3 top-3 rounded-full bg-brand-accent/20 px-2 py-1 text-[0.62rem] font-black uppercase text-action-primary">
            3/6
          </div>
          {previewCards.map((card) => (
            <div
              key={`${card.rank}${card.suit}`}
              className={`absolute flex h-24 w-16 flex-col justify-between rounded-xl border border-action-primary/20 bg-surface-primary p-2 shadow-md ${card.pose}`}
            >
              <div
                className={`text-base font-black leading-none ${
                  card.suit === '♠' ? 'text-text-primary' : 'text-accent-kumkum'
                }`}
              >
                {card.rank}
                <span className="block text-lg">{card.suit}</span>
              </div>
              <div
                className={`self-center text-3xl ${
                  card.suit === '♠' ? 'text-text-primary' : 'text-accent-kumkum'
                }`}
              >
                {card.suit}
              </div>
            </div>
          ))}
          <div className="absolute bottom-3 rounded-full bg-action-secondary/25 px-3 py-1 text-xs font-bold text-action-primary shadow-sm">
            {noDownloadLabel}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex h-12 items-center justify-center rounded-md bg-action-primary px-2 text-center text-xs font-black text-text-onBrand">
            {playLabel}
          </div>
          <div className="flex h-12 items-center justify-center rounded-md border border-action-primary/30 bg-surface-primary px-2 text-center text-xs font-black text-action-primary">
            {joinLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileAppLanding(): ReactElement {
  const { locale } = usePreferredLocale();
  const { t } = createTranslator(locale);
  const trustItems = [
    t('mobile.trust.noBetting'),
    t('mobile.trust.guest'),
    t('mobile.trust.rooms'),
    t('mobile.trust.languages'),
  ];
  const installSteps = [
    t('mobile.install.stepOne'),
    t('mobile.install.stepTwo'),
    t('mobile.install.stepThree'),
  ];

  return (
    <LandingShell>
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 pb-10 pt-8 md:grid-cols-[minmax(0,1fr)_22rem] md:items-center md:px-8 md:pb-14 md:pt-12">
        <div className="landing-hero-copy">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
            {t('mobile.hero.eyebrow')}
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-action-primary md:text-6xl">
            {t('mobile.hero.title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-text-primary">
            {t('mobile.hero.body')}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="#games"
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-action-primary px-5 text-sm font-bold text-text-onBrand shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {t('mobile.hero.primaryCta')}
            </Link>
            <Link
              href="/play/online"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-action-primary/30 bg-surface-primary px-5 text-sm font-bold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {t('mobile.hero.secondaryCta')}
            </Link>
          </div>

          <ul className="mt-6 flex flex-wrap gap-2" aria-label={t('landing.trust.label')}>
            {trustItems.map((item) => (
              <li
                key={item}
                className="rounded-full border border-action-primary/15 bg-surface-primary/80 px-3 py-2 text-sm font-semibold text-text-primary"
              >
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-text-primary">
            {t('mobile.hero.note')}
          </p>
        </div>

        <PhonePreview
          guestLabel={t('landing.hero.trust.guest')}
          readyLabel={t('mobile.preview.ready')}
          tableLabel={t('mobile.preview.table')}
          roomLabel={t('mobile.preview.room')}
          noDownloadLabel={t('mobile.preview.noDownload')}
          gadhaChorLabel={t('games.gadhaChor.name')}
          lalSattiLabel={t('games.lalSatti.name')}
          playLabel={t('action.playComputer')}
          joinLabel={t('action.joinRoom')}
        />
      </section>

      <section
        className="mx-auto grid w-full max-w-7xl gap-5 px-5 py-8 md:grid-cols-[0.85fr_1.15fr] md:px-8 md:py-12"
        id="how-to-play"
      >
        <div>
          <h2 className="text-3xl font-black text-action-primary md:text-4xl">
            {t('mobile.install.title')}
          </h2>
          <p className="mt-4 text-base leading-7 text-text-primary">{t('mobile.install.body')}</p>
        </div>
        <ol className="grid gap-3">
          {installSteps.map((step, index) => (
            <li
              key={step}
              className="flex gap-4 rounded-lg border border-action-primary/15 bg-surface-primary p-4 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action-primary text-sm font-black text-text-onBrand">
                {index + 1}
              </span>
              <span className="pt-1 text-base leading-7 text-text-primary">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-12" id="games">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-black text-action-primary md:text-4xl">
            {t('mobile.games.title')}
          </h2>
          <p className="mt-4 text-base leading-7 text-text-primary">{t('mobile.games.body')}</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/play/gadha-chor/computer"
            className="rounded-lg border border-action-primary/15 bg-surface-primary p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
              {t('landing.game.computerHint')}
            </p>
            <h3 className="mt-3 text-2xl font-black text-action-primary">
              {t('mobile.games.gadhaChor')}
            </h3>
            <p className="mt-3 text-sm leading-6 text-text-primary">
              {t('landing.game.gadhaChor.description')}
            </p>
          </Link>
          <Link
            href="/play/lal-satti/computer"
            className="rounded-lg border border-action-primary/15 bg-surface-primary p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
              {t('landing.game.computerHint')}
            </p>
            <h3 className="mt-3 text-2xl font-black text-action-primary">
              {t('mobile.games.lalSatti')}
            </h3>
            <p className="mt-3 text-sm leading-6 text-text-primary">
              {t('landing.game.lalSatti.description')}
            </p>
          </Link>
        </div>
      </section>

      <LandingFooter locale={locale} />
    </LandingShell>
  );
}
