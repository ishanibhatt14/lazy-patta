'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';

import { trackGrowthEvent } from '../../lib/growth/analytics';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { resolveActiveSession, type ActiveSessionPointer } from '../../lib/mobile/active-session';
import { readRecentGame } from '../../lib/mobile/recent';
import { findCatalogItem, MOBILE_CATALOG, type MobileCatalogItem } from '../../lib/mobile-catalog';
import { LandingLanguageMenu } from '../home/landing/LandingLanguageMenu';

import { DailyPlayCard } from './DailyPlayCard';
import { GameCatalogGrid } from './GameCatalogGrid';
import { InstallHomeCard } from './InstallHomeCard';
import { InviteFamilyCard } from './InviteFamilyCard';
import { LazyPattaLogoMark } from './artwork/LazyPattaLogoMark';
import { PatternBackground } from './artwork/PatternBackground';
import { PlayerAvatar } from './artwork/PlayerAvatar';
import { CardsIcon, KeyIcon, PlayIcon, SettingsIcon } from './icons';

export function MobileHome(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  // localStorage is client-only; read after mount so SSR and first paint agree.
  const [recent, setRecent] = useState<MobileCatalogItem | undefined>(undefined);
  const [active, setActive] = useState<ActiveSessionPointer | null>(null);
  useEffect(() => setRecent(readRecentGame()), []);
  useEffect(() => {
    let cancelled = false;
    void resolveActiveSession().then((pointer) => {
      if (!cancelled) setActive(pointer);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => trackGrowthEvent({ name: 'mobile_home_viewed' }), []);

  const activeItem = active ? findCatalogItem(active.gameSlug) : undefined;
  // Quick Play target: the last game the player touched (if it has a practice
  // route), otherwise the easiest game, Gadha Chor. `&quick=1` deals straight
  // from the tile, so the primary CTA reaches a working game in one tap.
  const quickGame = recent?.practiceRoute ? recent : findCatalogItem('gadha-chor');

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

      {/* Quick Play — the fastest path to a working game. Instant bot play is
          the primary journey; the now-live family rooms sit just beneath it. */}
      {active && activeItem ? (
        <Link
          href={`/mobile/game/${active.gameSlug}/computer/${active.sessionId}`}
          className="flex items-center gap-4 rounded-2xl bg-action-primary px-5 py-4 text-text-onBrand shadow-lg transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <PlayIcon aria-hidden width={24} height={24} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-xs font-bold uppercase tracking-wide text-text-onBrand/80">
              {t.t('mobile.home.continueGame')}
            </span>
            <span className="text-lg font-black leading-tight">{t.t(activeItem.nameKey)}</span>
          </span>
          <span className="shrink-0 rounded-full bg-white/20 px-4 py-2 text-sm font-black">
            {t.t('mobile.home.continueCta')}
          </span>
        </Link>
      ) : quickGame?.practiceRoute ? (
        <Link
          href={`${quickGame.practiceRoute}&quick=1`}
          className="flex items-center gap-4 rounded-2xl bg-action-primary px-5 py-4 text-text-onBrand shadow-lg transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <PlayIcon aria-hidden width={24} height={24} />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-xs font-bold uppercase tracking-wide text-text-onBrand/80">
              {recent?.practiceRoute
                ? t.t('mobile.home.recentGame')
                : t.t('mobile.home.quickPlayTitle')}
            </span>
            <span className="text-lg font-black leading-tight">{t.t(quickGame.nameKey)}</span>
            <span className="text-sm text-text-onBrand/85">
              {recent?.practiceRoute ? t.t(quickGame.taglineKey) : t.t('mobile.home.quickPlayBody')}
            </span>
          </span>
          <span className="shrink-0 rounded-full bg-white/20 px-4 py-2 text-sm font-black">
            {t.t('mobile.home.playCta')}
          </span>
        </Link>
      ) : null}

      {/* Family rooms — now verified live, offered as a warm secondary action
          rather than the first thing a solo player must step past. */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/mobile/rooms"
          className="flex flex-col gap-2 rounded-2xl border border-action-secondary/30 bg-surface-primary px-4 py-4 text-action-primary shadow-sm transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-action-primary/10">
            <CardsIcon aria-hidden width={20} height={20} />
          </span>
          <span className="text-sm font-black leading-tight">
            {t.t('mobile.home.createRoomTitle')}
          </span>
          <span className="text-xs text-text-primary/70">{t.t('mobile.home.createRoomBody')}</span>
        </Link>
        <Link
          href="/mobile/rooms"
          className="flex flex-col gap-2 rounded-2xl border border-action-secondary/30 bg-surface-primary px-4 py-4 text-action-primary shadow-sm transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-action-primary/10">
            <KeyIcon aria-hidden width={20} height={20} />
          </span>
          <span className="text-sm font-black leading-tight">
            {t.t('mobile.home.joinRoomTitle')}
          </span>
          <span className="text-xs text-text-primary/70">{t.t('mobile.home.joinRoomBody')}</span>
        </Link>
      </div>

      <DailyPlayCard t={t} />

      <InstallHomeCard t={t} engaged={recent !== undefined || active !== null} />

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
