'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';

import { LandingLanguageMenu } from './LandingLanguageMenu';

export function LandingTopNav(): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const { locale } = usePreferredLocale();
  const { t } = createTranslator(locale);

  const links = [
    { href: '#games', label: t('landing.nav.games') },
    { href: '/play/online', label: t('landing.nav.playOnline') },
    { href: '#how-to-play', label: t('landing.nav.howToPlay') },
  ];

  return (
    <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
      <Link
        href="/"
        className="flex min-h-12 items-center gap-3 rounded-md pr-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      >
        <Image
          src="/images/lazy-patta-logo-transparent.png"
          alt={t('brand.logoAlt')}
          width={48}
          height={48}
          priority
          className="h-12 w-12 object-contain"
        />
        <span className="text-lg font-black text-action-primary">{t('app.name')}</span>
      </Link>

      <nav className="hidden items-center gap-2 md:flex" aria-label={t('landing.nav.label')}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-12 items-center rounded-md px-4 text-sm font-semibold text-text-primary hover:text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <LandingLanguageMenu />
        <button
          type="button"
          className="inline-flex min-h-12 items-center rounded-md border border-action-primary/30 bg-surface-primary px-4 text-sm font-bold text-action-primary md:hidden"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          {t('landing.nav.menu')}
        </button>
      </div>

      {menuOpen ? (
        <nav
          className="absolute inset-x-5 top-[calc(100%+0.25rem)] grid gap-2 rounded-lg border border-action-primary/20 bg-surface-primary p-3 shadow-xl md:hidden"
          aria-label={t('landing.nav.label')}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-12 items-center rounded-md px-3 font-semibold text-text-primary hover:bg-background-canvas"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
