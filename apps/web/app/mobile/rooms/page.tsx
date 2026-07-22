'use client';

import { Suspense, type ReactElement } from 'react';

import { OnlineHub } from '../../../components/rooms/OnlineHub';
import { AuthContextProvider } from '../../../lib/auth/auth-context';
import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';

export default function MobileRoomsPage(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-black text-action-primary">{t.t('mobile.rooms.title')}</h1>
        <p className="mt-1 text-sm leading-6 text-text-primary/80">
          {t.t('mobile.rooms.subtitle')}
        </p>
      </header>

      {/* Auth + Supabase load only on this route, mirroring `/play/online`. */}
      <AuthContextProvider>
        <Suspense
          fallback={<p className="text-sm text-text-primary/70">{t.t('rooms.creating')}</p>}
        >
          <div className="flex justify-center">
            <OnlineHub />
          </div>
        </Suspense>
      </AuthContextProvider>
    </div>
  );
}
