'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { readRecentGame } from '../../lib/mobile/recent';
import { MOBILE_CATALOG, type MobileCatalogItem } from '../../lib/mobile-catalog';
import { LandingLanguageMenu } from '../home/landing/LandingLanguageMenu';

import { GameCatalogGrid } from './GameCatalogGrid';
import { SettingsIcon } from './icons';

export function MobileHome(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);
  // localStorage is client-only; read after mount so SSR and first paint agree.
  const [recent, setRecent] = useState<MobileCatalogItem | undefined>(undefined);
  useEffect(() => setRecent(readRecentGame()), []);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Image
            src="/images/lazy-patta-logo-transparent.png"
            alt="Lazy Patta"
            width={44}
            height={44}
            className="h-11 w-11 object-contain"
            priority
          />
          <p className="text-lg font-black leading-tight text-action-primary">
            {t.t('mobile.home.greeting')}
          </p>
        </div>
        <Link
          href="/mobile/settings"
          aria-label={t.t('mobile.home.settingsLabel')}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-action-primary/20 bg-surface-primary text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <SettingsIcon aria-hidden width={22} height={22} />
        </Link>
      </header>

      <div className="grid gap-3">
        <Link
          href="/mobile/rooms"
          className="flex flex-col rounded-2xl bg-action-primary px-5 py-4 text-text-onBrand shadow-sm transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="text-lg font-black">{t.t('mobile.home.createRoomTitle')}</span>
          <span className="text-sm text-text-onBrand/85">{t.t('mobile.home.createRoomBody')}</span>
        </Link>
        <Link
          href="/mobile/rooms"
          className="flex flex-col rounded-2xl border border-action-primary/20 bg-surface-primary px-5 py-4 text-action-primary shadow-sm transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          <span className="text-lg font-black">{t.t('mobile.home.joinRoomTitle')}</span>
          <span className="text-sm text-text-primary/80">{t.t('mobile.home.joinRoomBody')}</span>
        </Link>
      </div>

      {recent?.practiceRoute ? (
        <Link
          href={recent.practiceRoute}
          className="flex items-center justify-between gap-3 rounded-2xl border border-brand-accent/30 bg-brand-accent/8 px-5 py-4 transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
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

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-black text-action-primary">
            {t.t('mobile.home.chooseGame')}
          </h2>
          <LandingLanguageMenu />
        </div>
        <GameCatalogGrid items={MOBILE_CATALOG} t={t} />
      </section>
    </div>
  );
}
