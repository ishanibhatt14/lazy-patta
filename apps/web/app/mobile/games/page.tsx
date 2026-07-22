'use client';

import type { ReactElement } from 'react';

import { GameCatalogGrid } from '../../../components/mobile/GameCatalogGrid';
import { createTranslator } from '../../../lib/i18n';
import { usePreferredLocale } from '../../../lib/locale/preferred-locale-context';
import { MOBILE_CATALOG } from '../../../lib/mobile-catalog';

export default function MobileGamesPage(): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-black text-action-primary">{t.t('mobile.home.chooseGame')}</h1>
        <p className="mt-1 text-sm leading-6 text-text-primary/80">{t.t('mobile.games.body')}</p>
      </header>
      <GameCatalogGrid items={MOBILE_CATALOG} t={t} />
    </div>
  );
}
