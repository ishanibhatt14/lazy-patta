'use client';

import { useEffect, useState, type ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import { readDailyProgress, type DailyProgress } from '../../lib/mobile/daily-activity';

/**
 * A warm, honest "how much have we played today" card for the mobile Home.
 *
 * This is deliberately NOT a retention dark-pattern: no streak to break, no
 * countdown, no currency, no reward to claim. It simply reflects games the
 * player actually launched today and offers a small acknowledgement when the
 * game night fills up. A new day quietly reads back as zero — a fresh start,
 * never a "you lost it!" scold.
 */
export function DailyPlayCard({ t }: { readonly t: Translator }): ReactElement | null {
  // localStorage is client-only; read after mount so SSR and first paint agree.
  const [progress, setProgress] = useState<DailyProgress | null>(null);
  useEffect(() => setProgress(readDailyProgress()), []);

  if (!progress) return null;

  const { played, goal } = progress;
  const complete = played >= goal;
  const pct = Math.min(Math.round((played / goal) * 100), 100);

  const body = complete
    ? t.t('mobile.home.todayComplete')
    : played > 0
      ? t.format('mobile.home.todayProgress', { played, goal })
      : t.t('mobile.home.todayEmpty');

  return (
    <section
      aria-label={t.t('mobile.home.todayTitle')}
      className="flex flex-col gap-3 rounded-2xl border border-action-primary/15 bg-surface-primary px-5 py-4 shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-black text-action-primary">
          {t.t('mobile.home.todayTitle')}
        </h2>
        <span className="text-sm font-black tabular-nums text-brand-accent">
          {played}/{goal}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-action-primary/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(played, goal)}
      >
        <div
          className="h-full rounded-full bg-brand-accent transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm leading-6 text-text-primary/80">{body}</p>
    </section>
  );
}
