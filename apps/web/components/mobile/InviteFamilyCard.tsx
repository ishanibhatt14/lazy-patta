'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

import type { Translator } from '../../lib/i18n';
import { siteConfig } from '../../lib/site-config';

/**
 * A gentle "bring the family in" card. This is a plain share of the app — there
 * is NO referral code, NO reward, and NO cash incentive of any kind. It just
 * makes it easy to hand the game to a relative for the next game night, using
 * the native share sheet where available and a clipboard copy as a fallback.
 */
export function InviteFamilyCard({ t }: { readonly t: Translator }): ReactElement {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleInvite(): Promise<void> {
    const url = siteConfig.canonicalOrigin;
    const text = t.t('mobile.home.inviteBody');

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: siteConfig.name, text, url });
      } catch {
        // The user dismissed the share sheet (or it failed) — nothing to do.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: silently no-op rather than surface an error.
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-action-primary/15 bg-surface-primary px-5 py-4 shadow-sm">
      <div className="flex flex-col">
        <h2 className="text-base font-black text-action-primary">
          {t.t('mobile.home.inviteTitle')}
        </h2>
        <p className="text-sm leading-6 text-text-primary/80">{t.t('mobile.home.inviteBody')}</p>
      </div>
      <button
        type="button"
        onClick={() => void handleInvite()}
        className="min-h-12 w-full rounded-xl bg-action-primary px-4 text-sm font-black text-text-onBrand transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
      >
        {copied ? t.t('mobile.home.inviteCopied') : t.t('mobile.home.inviteAction')}
      </button>
    </section>
  );
}
