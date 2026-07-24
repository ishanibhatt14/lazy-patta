'use client';

import type { MessageKey } from '@lazy-patta/localization';
import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';

import { trackGrowthEvent } from '../../lib/growth/analytics';
import { createTranslator, type Translator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { resolveActiveSession, type ActiveSessionPointer } from '../../lib/mobile/active-session';
import { readDisplayName } from '../../lib/mobile/display-name';
import { readRecentPlay, type RecentPlay } from '../../lib/mobile/recent';
import { findCatalogItem, MOBILE_CATALOG } from '../../lib/mobile-catalog';
import { LandingLanguageMenu } from '../home/landing/LandingLanguageMenu';

import { DailyPlayCard } from './DailyPlayCard';
import { GameCatalogGrid } from './GameCatalogGrid';
import { InstallHomeCard } from './InstallHomeCard';
import { InviteFamilyCard } from './InviteFamilyCard';
import { MobileScreenshotGallery } from './MobileScreenshotGallery';
import { CardFanArtwork, type FanCard } from './artwork/CardFanArtwork';
import { GameTileArtwork } from './artwork/GameTileArtwork';
import { LazyPattaLogoMark } from './artwork/LazyPattaLogoMark';
import { PatternBackground } from './artwork/PatternBackground';
import { PlayerAvatar } from './artwork/PlayerAvatar';
import { CardsIcon, KeyIcon, PlayIcon, SettingsIcon } from './icons';

const HERO_FAN: readonly FanCard[] = [
  { rank: '7', suit: 'hearts' },
  { rank: 'A', suit: 'spades' },
  { rank: 'K', suit: 'diamonds' },
];

/** Time-of-day greeting, computed on the client so it matches the player's clock. */
function timeGreetingKey(hour: number): MessageKey {
  if (hour < 12) return 'mobile.home.greetingMorning';
  if (hour < 17) return 'mobile.home.greetingAfternoon';
  return 'mobile.home.greetingEvening';
}

/** Coarse, honest "when" for the last game — no fabricated precision. */
function timeAgo(t: Translator, playedAt: number | undefined, now: number): string {
  if (playedAt === undefined) return '';
  const minutes = Math.max(0, Math.floor((now - playedAt) / 60_000));
  if (minutes < 1) return t.t('mobile.home.recentJustNow');
  if (minutes < 60) return t.format('mobile.home.recentMinutesAgo', { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t.format('mobile.home.recentHoursAgo', { hours });
  return t.format('mobile.home.recentDaysAgo', { days: Math.floor(hours / 24) });
}

export function MobileHome(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  // localStorage and the wall clock are client-only; read after mount so SSR and
  // first paint agree, then adopt real values in effects to avoid a hydration gap.
  const [recentPlay, setRecentPlay] = useState<RecentPlay | undefined>(undefined);
  const [active, setActive] = useState<ActiveSessionPointer | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [greetingKey, setGreetingKey] = useState<MessageKey>('mobile.home.greeting');
  const [now, setNow] = useState(0);
  useEffect(() => {
    setRecentPlay(readRecentPlay());
    setDisplayName(readDisplayName());
    const clock = new Date();
    setGreetingKey(timeGreetingKey(clock.getHours()));
    setNow(clock.getTime());
  }, []);
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

  const recent = recentPlay?.item;
  const activeItem = active ? findCatalogItem(active.gameSlug) : undefined;
  // Quick Play target: the last game the player touched (if it has a practice
  // route), otherwise the easiest game, Gadha Chor. `&quick=1` deals straight
  // from the tile, so the primary CTA reaches a working game in one tap.
  const quickGame = recent?.practiceRoute ? recent : findCatalogItem('gadha-chor');
  const greetingName = displayName || t.t('mobile.home.guest');

  const resuming = active !== null && activeItem !== undefined;
  const heroItem = resuming ? activeItem : quickGame;
  const heroHref = resuming
    ? `/mobile/game/${active.gameSlug}/computer/${active.sessionId}`
    : quickGame?.practiceRoute
      ? `${quickGame.practiceRoute}&quick=1`
      : null;
  const heroEyebrowKey: MessageKey = resuming
    ? 'mobile.home.continueGame'
    : 'mobile.home.quickPlayTitle';
  const heroCtaKey: MessageKey = resuming ? 'mobile.home.continueCta' : 'mobile.home.playCta';

  return (
    <div className="flex flex-col gap-6">
      {/* Immersive brand banner: bleeds to the screen edges and the very top. */}
      <section className="relative -mx-4 -mt-[calc(env(safe-area-inset-top)+1rem)] overflow-hidden rounded-b-[2rem] border-b border-action-secondary/25 bg-gradient-to-b from-surface-primary via-surface-primary to-background-canvas px-4 pb-7 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-lg">
        <PatternBackground className="text-action-secondary" opacity={0.06} />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PlayerAvatar name={greetingName} size="md" />
              <div className="flex flex-col leading-tight">
                <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-text-primary/55">
                  {t.t(greetingKey)}
                </span>
                <span className="text-base font-black text-action-primary">{greetingName}</span>
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
      {heroItem && heroHref ? (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-action-primary to-action-primary/85 p-5 text-text-onBrand shadow-lg">
          <PatternBackground className="text-white" opacity={0.08} />
          <div className="relative z-10 flex items-center gap-4">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-white/10">
              <CardFanArtwork cards={HERO_FAN} size="sm" />
            </span>
            <div className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide text-text-onBrand/80">
                {t.t(heroEyebrowKey)}
              </span>
              <span className="text-xl font-black leading-tight">{t.t(heroItem.nameKey)}</span>
              <span className="flex flex-wrap items-center gap-2 text-[0.7rem] font-bold">
                <span className="rounded-full bg-white/15 px-2 py-0.5">
                  {t.format('mobile.game.playersRange', {
                    min: heroItem.minPlayers,
                    max: heroItem.maxPlayers,
                  })}
                </span>
                <span className="rounded-full bg-white/15 px-2 py-0.5">
                  {t.format('mobile.game.durationRange', {
                    min: heroItem.durationMinutes.min,
                    max: heroItem.durationMinutes.max,
                  })}
                </span>
              </span>
            </div>
          </div>
          <div className="relative z-10 mt-4 flex items-center gap-3">
            <Link
              href={heroHref}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-action-primary shadow-md transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              <PlayIcon aria-hidden width={20} height={20} />
              {t.t(heroCtaKey)}
            </Link>
            {heroItem.rulesRoute ? (
              <Link
                href={heroItem.rulesRoute}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-black transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                aria-label={t.format('mobile.home.howToPlayLabel', { name: t.t(heroItem.nameKey) })}
              >
                <span aria-hidden>i</span>
              </Link>
            ) : null}
          </div>
        </section>
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
          <div className="flex items-center gap-2">
            <Link
              href="/mobile/games"
              className="text-sm font-bold text-action-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {t.t('mobile.home.viewAll')}
            </Link>
            <LandingLanguageMenu />
          </div>
        </div>
        <GameCatalogGrid items={MOBILE_CATALOG} t={t} />
      </section>

      {recentPlay && recentPlay.item.practiceRoute ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-black text-action-primary">
            {t.t('mobile.home.recentlyPlayedHeading')}
          </h2>
          <div className="flex items-center gap-4 rounded-2xl border border-action-secondary/25 bg-surface-primary px-4 py-3 shadow-sm">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-action-primary/10">
              <GameTileArtwork gameId={recentPlay.item.id} size="sm" />
            </span>
            <div className="flex flex-1 flex-col">
              <span className="text-base font-black leading-tight text-action-primary">
                {t.t(recentPlay.item.nameKey)}
              </span>
              <span className="text-xs font-semibold text-text-primary/65">
                {t.t('mobile.home.recentSolo')}
                {timeAgo(t, recentPlay.playedAt, now)
                  ? ` · ${timeAgo(t, recentPlay.playedAt, now)}`
                  : ''}
              </span>
            </div>
            <Link
              href={`${recentPlay.item.practiceRoute}&quick=1`}
              aria-label={t.format('mobile.home.playAgainLabel', {
                name: t.t(recentPlay.item.nameKey),
              })}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-action-primary text-text-onBrand shadow-md transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              <PlayIcon aria-hidden width={22} height={22} />
            </Link>
          </div>
        </section>
      ) : null}

      <MobileScreenshotGallery t={t} />

      <InviteFamilyCard t={t} />
    </div>
  );
}
