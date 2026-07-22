'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { readRecentGame } from '../../lib/mobile/recent';
import { MOBILE_CATALOG, type MobileCatalogItem } from '../../lib/mobile-catalog';
import { LandingLanguageMenu } from '../home/landing/LandingLanguageMenu';

import { DailyPlayCard } from './DailyPlayCard';
import { GameCatalogGrid } from './GameCatalogGrid';
import { InviteFamilyCard } from './InviteFamilyCard';
import { LazyPattaLogoMark } from './artwork/LazyPattaLogoMark';
import { PatternBackground } from './artwork/PatternBackground';
import { PlayerAvatar } from './artwork/PlayerAvatar';
import { CardsIcon, KeyIcon, SettingsIcon } from './icons';

export function MobileHome(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  // localStorage is client-only; read after mount so SSR and first paint agree.
  const [recent, setRecent] = useState<MobileCatalogItem | undefined>(undefined);
  useEffect(() => setRecent(readRecentGame()), []);

  return (
    <div className="flex flex-col gap-6">
      {/* Immersive brand banner: bleeds to the screen edges and the very top. */}
      <section className="relative -mx-4 -mt-[calc(env(safe-area-inset-top)+1rem)] overflow-hidden rounded-b-[2rem] border-b border-action-secondary/25 bg-gradient-to-b from-surface-primary via-surface-primary to-background-canvas px-4 pb-7 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-lg">
        <PatternBackground className="text-action-secondary" opacity={0.06} />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PlayerAvatar name={t.t('mobile.home.guest')} size="md" />
              <div className="flex flex-col leading-tight">
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-text-primary/55">
                  {t.t('mobile.home.guest')}
                </span>
                <span className="text-sm font-black text-action-primary">
                  {t.t('mobile.home.greeting')}
                </span>
              </div>
            </div>
            <Link
              href="/mobile/settings"
              aria-label={t.t('mobile.home.settingsLabel')}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-action-secondary/30 bg-background-canvas/40 text-action-primary backdrop-blur focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              <SettingsIcon aria-hidden width={22} height={22} />
            </Link>
          </div>

          <div className="mt-5 flex flex-col items-center">
            <LazyPattaLogoMark />
            <p className="mt-3 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-text-primary/55">
              {t.t('mobile.home.heroTagline')}
            </p>
          </div>
        </div>
      </section>

      {/* Primary actions. */}
      <div className="grid gap-3">
        <Link
          href="/mobile/rooms"
          className="flex items-center gap-4 rounded-2xl bg-action-primary px-5 py-4 text-text-onBrand shadow-lg transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <CardsIcon aria-hidden width={24} height={24} />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-black leading-tight">
              {t.t('mobile.home.createRoomTitle')}
            </span>
            <span className="text-sm text-text-onBrand/85">
              {t.t('mobile.home.createRoomBody')}
            </span>
          </span>
        </Link>
        <Link
          href="/mobile/rooms"
          className="flex items-center gap-4 rounded-2xl border border-action-secondary/30 bg-surface-primary px-5 py-4 text-action-primary shadow-sm transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-action-primary/10">
            <KeyIcon aria-hidden width={24} height={24} />
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-black leading-tight">
              {t.t('mobile.home.joinRoomTitle')}
            </span>
            <span className="text-sm text-text-primary/80">{t.t('mobile.home.joinRoomBody')}</span>
          </span>
        </Link>
      </div>

      {recent?.practiceRoute ? (
        <Link
          href={recent.practiceRoute}
          className="flex items-center justify-between gap-3 rounded-2xl border border-brand-accent/40 bg-brand-accent/10 px-5 py-4 transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-accent">
              {t.t('mobile.home.recentGame')}
            </span>
            <span className="text-base font-black text-action-primary">{t.t(recent.nameKey)}</span>
          </span>
          <span className="rounded-full bg-action-primary px-4 py-2 text-sm font-black text-text-onBrand">
            {t.t('mobile.home.resume')}
          </span>
        </Link>
      ) : null}

      <DailyPlayCard t={t} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-action-primary">
            {t.t('mobile.home.chooseGame')}
          </h2>
          <LandingLanguageMenu />
        </div>
        <GameCatalogGrid items={MOBILE_CATALOG} t={t} />
      </section>

      <InviteFamilyCard t={t} />
    </div>
  );
}
