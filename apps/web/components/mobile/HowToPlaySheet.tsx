'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { GAME_DISCOVERY, type GameSlug } from '../../lib/game-discovery';
import type { Translator } from '../../lib/i18n';
import type { MobileCatalogItem } from '../../lib/mobile-catalog';

import { BottomSheet } from './BottomSheet';

/**
 * In-app "How to Play" surface for the Learn screen. Instead of navigating away
 * to a long SEO rules page, it opens a bottom sheet with the same authored rules
 * sections (`GAME_DISCOVERY[slug].sections`) rendered inline. The full SEO page
 * is preserved and still reachable via a "Read the full rules" link at the end,
 * so search-indexed content is untouched.
 */
export function HowToPlaySheet({
  item,
  t,
  onClose,
}: {
  readonly item: MobileCatalogItem | null;
  readonly t: Translator;
  readonly onClose: () => void;
}): ReactElement | null {
  const discovery = item ? GAME_DISCOVERY[item.slug as GameSlug] : undefined;

  return (
    <BottomSheet
      open={item !== null && discovery !== undefined}
      onClose={onClose}
      title={item ? t.t(item.nameKey) : ''}
    >
      {item && discovery ? (
        <div className="mt-2 flex flex-col gap-4">
          <p className="text-sm leading-6 text-text-primary/90">{t.t(discovery.detailIntroKey)}</p>

          <dl className="flex flex-col gap-4">
            {discovery.sections.map((section) => (
              <div key={section.titleKey} className="flex flex-col gap-1">
                <dt className="text-sm font-black text-action-primary">{t.t(section.titleKey)}</dt>
                <dd className="text-sm leading-6 text-text-primary/85">{t.t(section.bodyKey)}</dd>
              </div>
            ))}
          </dl>

          {item.rulesRoute ? (
            <Link
              href={item.rulesRoute}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-action-secondary/25 px-5 text-sm font-black text-action-primary transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            >
              {t.t('mobile.learn.rulesLink')} →
            </Link>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  );
}
