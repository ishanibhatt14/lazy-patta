import type { Locale } from '@lazy-patta/localization';
import type { ReactElement } from 'react';

import { createTranslator } from '../../../lib/i18n';

export function PlayModeSection({ locale }: { readonly locale: Locale }): ReactElement {
  const { t } = createTranslator(locale);
  const modes = [
    {
      title: t('landing.mode.computer.title'),
      body: t('landing.mode.computer.body'),
      status: t('games.status.available'),
      available: true,
    },
    {
      title: t('landing.mode.private.title'),
      body: t('landing.mode.private.body'),
      status: t('games.status.available'),
      available: true,
    },
    {
      title: t('landing.mode.pass.title'),
      body: t('landing.mode.pass.body'),
      status: t('games.status.comingSoon'),
      available: false,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8" id="how-to-play">
      <div className="mb-5 flex flex-col gap-2">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-accent">
          {t('landing.mode.eyebrow')}
        </p>
        <h2 className="text-3xl font-black text-action-primary md:text-4xl">
          {t('landing.mode.title')}
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {modes.map((mode) => (
          <article
            key={mode.title}
            className={[
              'min-h-48 rounded-lg border p-5 shadow-sm',
              mode.available
                ? 'border-action-primary/20 bg-surface-primary'
                : 'border-action-primary/10 bg-background-canvas opacity-75',
            ].join(' ')}
            aria-disabled={mode.available ? undefined : true}
          >
            <span className="text-xs font-black uppercase tracking-wide text-brand-accent">
              {mode.status}
            </span>
            <h3 className="mt-4 text-xl font-black text-action-primary">{mode.title}</h3>
            <p className="mt-2 text-sm leading-6 text-text-primary">{mode.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
