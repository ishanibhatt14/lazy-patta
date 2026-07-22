'use client';

import type { MessageKey } from '@lazy-patta/localization';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactElement, ReactNode, SVGProps } from 'react';

import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';

import { HomeIcon, LearnIcon, RoomsIcon, SettingsIcon } from './icons';

/**
 * The persistent app frame for `/mobile/*`: a scrollable content column plus a
 * fixed four-item bottom nav that respects the phone's safe-area inset. Live
 * gameplay does not mount under this shell (it lives at `/play/online/[code]`),
 * so the nav is simply absent during a game rather than conditionally hidden.
 */

interface NavItem {
  readonly href: string;
  readonly labelKey: MessageKey;
  readonly Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/mobile', labelKey: 'mobileNav.home', Icon: HomeIcon },
  { href: '/mobile/rooms', labelKey: 'mobileNav.rooms', Icon: RoomsIcon },
  { href: '/mobile/how-to-play', labelKey: 'mobileNav.learn', Icon: LearnIcon },
  { href: '/mobile/settings', labelKey: 'mobileNav.settings', Icon: SettingsIcon },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/mobile' ? pathname === '/mobile' : pathname.startsWith(href);
}

export function MobileShell({ children }: { readonly children: ReactNode }): ReactElement {
  const { locale } = usePreferredLocale();
  const { t } = createTranslator(locale);
  const pathname = usePathname() ?? '/mobile';
  const gameplay = pathname.startsWith('/mobile/game/') && pathname.includes('/computer/');

  if (gameplay) {
    return <div className="min-h-[100dvh] bg-background-canvas">{children}</div>;
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background-canvas">
      <main className="flex-1 px-4 pb-28 pt-[calc(env(safe-area-inset-top)+1rem)]">{children}</main>

      <nav
        aria-label={t('mobileNav.home')}
        className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-md justify-around border-t border-action-secondary/25 bg-surface-primary/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.25)] backdrop-blur-lg"
      >
        {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={[
                'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.7rem] font-bold transition',
                active ? 'text-action-primary' : 'text-text-primary/55',
              ].join(' ')}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-action-secondary"
                />
              ) : null}
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-xl transition',
                  active ? 'bg-action-primary/12' : '',
                ].join(' ')}
              >
                <Icon aria-hidden width={22} height={22} />
              </span>
              {t(labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
