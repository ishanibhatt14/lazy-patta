'use client';

import type { Locale } from '@lazy-patta/localization';
import Image, { type ImageLoaderProps } from 'next/image';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

const BASE = '/images/landing/gujarati-family-card-night';

/**
 * Serve the pre-optimized AVIF export closest to the requested width. This keeps
 * responsive delivery deterministic (mobile ≈58KB, tablet ≈121KB, desktop ≈175KB)
 * regardless of whether the runtime image optimizer is active.
 */
function familyImageLoader({ width }: ImageLoaderProps): string {
  if (width <= 800) return `${BASE}-750.avif`;
  if (width <= 1200) return `${BASE}-1100.avif`;
  return `${BASE}-1448.avif`;
}

export function HeroFamilyImage({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);

  return (
    <div className="landing-hero-media relative aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] border border-action-secondary/25 shadow-[0_1.5rem_3rem_-1rem_color-mix(in_srgb,var(--lp-scene-rim),transparent_45%)]">
      <Image
        loader={familyImageLoader}
        src={`${BASE}-1448.avif`}
        alt={t('landing.hero.imageAlt')}
        fill
        priority
        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 55vw, 640px"
        className="object-cover"
        style={{ objectPosition: '52% 52%' }}
      />
      <div className="landing-hero-media-glow pointer-events-none absolute inset-0" aria-hidden />
    </div>
  );
}
