import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

export function ComingGamesRail({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);
  const games = [
    t('landing.coming.judgement'),
    t('landing.coming.mendicot'),
    t('landing.coming.threeTwoFive'),
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
      <div className="mb-5 flex flex-col gap-2">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
          {t('landing.coming.eyebrow')}
        </p>
        <h2 className="text-3xl font-black text-action-primary">{t('landing.coming.title')}</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {games.map((game) => (
          <article
            key={game}
            className="rounded-lg border border-action-primary/10 bg-surface-primary/70 p-4 shadow-sm"
          >
            <div className="mb-3 h-20 rounded-md bg-background-canvas">
              <div className="grid h-full place-items-center text-2xl font-black text-action-primary/40">
                {game.slice(0, 1)}
              </div>
            </div>
            <h3 className="font-black text-text-primary">{game}</h3>
            <p className="mt-1 text-sm font-semibold text-brand-accent">
              {t('games.status.comingSoon')}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
