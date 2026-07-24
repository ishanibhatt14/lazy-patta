'use client';

import type { MessageKey } from '@lazy-patta/localization';
import Link from 'next/link';
import { useEffect, useState, type ComponentType, type ReactElement, type SVGProps } from 'react';

import { trackGrowthEvent } from '../../lib/growth/analytics';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { resolveActiveSession, type ActiveSessionPointer } from '../../lib/mobile/active-session';
import { readDisplayName } from '../../lib/mobile/display-name';
import { readRecentPlay } from '../../lib/mobile/recent';
import { findCatalogItem, MOBILE_CATALOG } from '../../lib/mobile-catalog';
import { LandingLanguageMenu } from '../home/landing/LandingLanguageMenu';

import { GameCatalogGrid } from './GameCatalogGrid';
import { InviteFamilyCard } from './InviteFamilyCard';
import { MobileScreenshotGallery } from './MobileScreenshotGallery';
import { LazyPattaLogoMark } from './artwork/LazyPattaLogoMark';
import { PatternBackground } from './artwork/PatternBackground';
import { PlayerAvatar } from './artwork/PlayerAvatar';
import { CheckIcon, GlobeIcon, KeyIcon, PlayIcon, RoomsIcon, SettingsIcon, UserIcon } from './icons';

/** Time-of-day greeting, computed on the client so it matches the player's clock. */
function timeGreetingKey(hour: number): MessageKey {
  if (hour < 12) return 'mobile.home.greetingMorning';
  if (hour < 17) return 'mobile.home.greetingAfternoon';
  return 'mobile.home.greetingEvening';
}

/** Why families can trust Lazy Patta — reuses the public landing trust copy. */
const BENEFITS: readonly {
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly labelKey: MessageKey;
}[] = [
  { Icon: CheckIcon, labelKey: 'landing.trust.noBetting' },
  { Icon: UserIcon, labelKey: 'landing.trust.guest' },
  { Icon: RoomsIcon, labelKey: 'landing.trust.rooms' },
  { Icon: GlobeIcon, labelKey: 'landing.trust.languages' },
];

/** The three honest steps of a game night, in order. */
const STEPS: readonly { readonly titleKey: MessageKey; readonly bodyKey: MessageKey }[] = [
  { titleKey: 'mobile.home.how.pickTitle', bodyKey: 'mobile.home.how.pickBody' },
  { titleKey: 'mobile.home.how.playTitle', bodyKey: 'mobile.home.how.playBody' },
  { titleKey: 'mobile.home.how.gatherTitle', bodyKey: 'mobile.home.how.gatherBody' },
];

export function MobileHome(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  // localStorage and the wall clock are client-only; read after mount so SSR and
  // first paint agree, then adopt real values in effects to avoid a hydration gap.
  const [recentId, setRecentId] = useState<string | undefined>(undefined);
  const [active, setActive] = useState<ActiveSessionPointer | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [greetingKey, setGreetingKey] = useState<MessageKey>('mobile.home.greeting');
  useEffect(() => {
    setRecentId(readRecentPlay()?.item.id);
    setDisplayName(readDisplayName());
    setGreetingKey(timeGreetingKey(new Date().getHours()));
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

  const recent = recentId ? findCatalogItem(recentId) : undefined;
  const activeItem = active ? findCatalogItem(active.gameSlug) : undefined;
  // "Play a game" target: the last game the player touched (if it has a practice
  // route), otherwise the easiest game, Gadha Chor. `&quick=1` deals straight in.
  const quickGame = recent?.practiceRoute ? recent : findCatalogItem('gadha-chor');
  const greetingName = displayName || t.t('mobile.home.guest');

  const resuming = active !== null && activeItem !== undefined;
  const primaryHref = resuming
    ? `/mobile/game/${active.gameSlug}/computer/${active.sessionId}`
    : quickGame?.practiceRoute
      ? `${quickGame.practiceRoute}&quick=1`
      : '/mobile/games';
  const primaryCtaKey: MessageKey = resuming
    ? 'mobile.home.continueCta'
    : 'mobile.home.heroPrimaryCta';

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Hero — the landing headline, a personalized greeting, and two CTAs.
          "Join with code" is the secondary action; creating a room is not the
          primary CTA while that flow is still maturing. */}
      <section className="relative -mx-4 -mt-[calc(env(safe-area-inset-top)+1rem)] overflow-hidden rounded-b-[2rem] border-b border-action-secondary/25 bg-gradient-to-b from-surface-primary via-surface-primary to-background-canvas px-4 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)] shadow-lg">
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

          <div className="mt-6 flex flex-col items-center text-center">
            <LazyPattaLogoMark />
            <h1 className="mt-4 text-3xl font-black leading-tight text-action-primary">
              {t.t('mobile.home.heroTagline')}
            </h1>
            <p className="mt-3 max-w-sm text-sm font-semibold text-text-primary/75">
              {t.t('mobile.home.heroSubheading')}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={primaryHref}
              className="flex items-center justify-center gap-2 rounded-2xl bg-action-primary px-5 py-4 text-base font-black text-text-onBrand shadow-md transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              <PlayIcon aria-hidden width={22} height={22} />
              {t.t(primaryCtaKey)}
            </Link>
            <Link
              href="/mobile/rooms"
              className="flex items-center justify-center gap-2 rounded-2xl border border-action-secondary/30 bg-surface-primary px-5 py-4 text-base font-black text-action-primary shadow-sm transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              <KeyIcon aria-hidden width={20} height={20} />
              {t.t('mobile.home.joinRoomTitle')}
            </Link>
          </div>
        </div>
      </section>

      {/* 2. See Lazy Patta in action — featured live table + filmstrip. */}
      <MobileScreenshotGallery t={t} />

      {/* 3. Choose a game. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-action-primary">
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

      {/* 4. Family benefits — the honest "why it's safe" reassurances. */}
      <section aria-labelledby="mobile-benefits-heading" className="flex flex-col gap-3">
        <h2 id="mobile-benefits-heading" className="text-xl font-black text-action-primary">
          {t.t('mobile.home.benefitsHeading')}
        </h2>
        <ul className="grid grid-cols-2 gap-3" role="list">
          {BENEFITS.map(({ Icon, labelKey }) => (
            <li
              key={labelKey}
              className="flex items-center gap-3 rounded-2xl border border-action-secondary/25 bg-surface-primary px-4 py-3 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-action-primary/10 text-action-primary">
                <Icon aria-hidden width={20} height={20} />
              </span>
              <span className="text-sm font-bold leading-tight text-action-primary">
                {t.t(labelKey)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. How it works — three honest steps. */}
      <section aria-labelledby="mobile-how-heading" className="flex flex-col gap-3">
        <h2 id="mobile-how-heading" className="text-xl font-black text-action-primary">
          {t.t('mobile.home.howItWorksHeading')}
        </h2>
        <ol className="flex flex-col gap-3" role="list">
          {STEPS.map(({ titleKey, bodyKey }, index) => (
            <li
              key={titleKey}
              className="flex items-start gap-4 rounded-2xl border border-action-secondary/25 bg-surface-primary px-4 py-4 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-action-primary text-sm font-black text-text-onBrand">
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-base font-black leading-tight text-action-primary">
                  {t.t(titleKey)}
                </span>
                <span className="text-sm text-text-primary/75">{t.t(bodyKey)}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 6. Final CTA. */}
      <InviteFamilyCard t={t} />
    </div>
  );
}
