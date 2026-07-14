import type { Metadata } from 'next';
import type { ReactElement } from 'react';

import { MobileAppLanding } from '../../components/home/MobileAppLanding';
import { createTranslator } from '../../lib/i18n';

const { t } = createTranslator('en');

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
  },
};

export default function MobilePage(): ReactElement {
  return <MobileAppLanding />;
}
