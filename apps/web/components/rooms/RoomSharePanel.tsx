'use client';

import type { Locale } from '@lazy-patta/localization';
import { useEffect, useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { Button } from '../Button';

/**
 * Share-first lobby affordance. The report's top conversion lever for joins is
 * surfacing the invite link and code immediately, so hosts can pull family in
 * without hunting for a way to share. Copy feedback is announced through a
 * polite live region; the WhatsApp deep link and native Web Share cover the two
 * channels families actually use. The absolute URL is resolved after mount so it
 * stays correct across preview/prod origins without leaking into SSR.
 */

export function RoomSharePanel({
  code,
  locale,
}: {
  readonly code: string;
  readonly locale: Locale;
}): ReactElement {
  const { t, format } = createTranslator(locale);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShareUrl(`${window.location.origin}/play/online/${code}`);
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, [code]);

  const resolveUrl = (): string =>
    shareUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}/play/online/${code}`
      : `/play/online/${code}`);

  const displayUrl = shareUrl || `…/play/online/${code}`;
  const inviteMessage = format('rooms.inviteMessage', { code, url: resolveUrl() });
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;

  const onCopy = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(resolveUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access can be blocked; the link stays visible for manual copy.
    }
  };

  const onNativeShare = async (): Promise<void> => {
    try {
      await navigator.share({ text: inviteMessage, url: resolveUrl() });
    } catch {
      // User dismissed the share sheet, or the share was cancelled.
    }
  };

  return (
    <section
      aria-label={t('rooms.inviteTitle')}
      className="flex flex-col gap-3 rounded-lg border border-action-primary/15 bg-surface-primary p-4 shadow-sm"
    >
      <p className="text-sm font-bold text-text-primary">{t('rooms.inviteTitle')}</p>
      <p
        className="truncate rounded-md bg-background-canvas px-3 py-2 text-sm text-text-primary"
        title={displayUrl}
      >
        {displayUrl}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="sm" className="min-h-12 flex-1" onClick={onCopy}>
          {t('rooms.copyLink')}
        </Button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md border border-action-primary px-4 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t('rooms.shareWhatsApp')}
        </a>
        {canNativeShare ? (
          <Button variant="ghost" size="sm" className="min-h-12 flex-1" onClick={onNativeShare}>
            {t('rooms.shareMore')}
          </Button>
        ) : null}
      </div>
      <p
        role="status"
        aria-live="polite"
        className="min-h-4 text-xs font-semibold text-brand-accent"
      >
        {copied ? t('rooms.linkCopied') : ''}
      </p>
    </section>
  );
}
