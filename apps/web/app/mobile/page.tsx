import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { MobileHome } from '../../components/mobile/MobileHome';
import { JsonLd } from '../../components/seo/JsonLd';
import { createTranslator } from '../../lib/i18n';
import { webApplicationJsonLd } from '../../lib/seo/structured-data';

const { t } = createTranslator('en');

const MOBILE_OG_IMAGE = {
  url: '/images/og/lazy-patta-mobile-1200x630.jpg',
  width: 1200,
  height: 630,
  alt: 'Lazy Patta — play Indian card games on your phone',
} as const;

export const metadata: Metadata = {
  title: t('mobile.meta.title'),
  description: t('mobile.meta.description'),
  alternates: {
    canonical: '/mobile',
  },
  openGraph: {
    title: t('mobile.meta.title'),
    description: t('mobile.meta.description'),
    type: 'website',
    url: '/mobile',
    images: [MOBILE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: t('mobile.meta.title'),
    description: t('mobile.meta.description'),
    images: [MOBILE_OG_IMAGE.url],
  },
};

export default function MobilePage(): ReactElement {
  return (
    <>
      <JsonLd data={webApplicationJsonLd(t('mobile.meta.description'))} />
      <MobileHome />
    </>
  );
}
