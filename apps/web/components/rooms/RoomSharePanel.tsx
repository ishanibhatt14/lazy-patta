'use client';

import type { Locale } from '@lazy-patta/localization';
import { useEffect, useState, type ReactElement } from 'react';

import { trackGrowthEvent, type ShareMethod } from '../../lib/growth/analytics';
import {
  familyInviteText,
  shareFamilyInvite,
  whatsAppShareUrl,
  type FamilyInvitePayload,
} from '../../lib/growth/family-invite';
import { createTranslator } from '../../lib/i18n';
import { buildRoomInviteUrl } from '../../lib/room-invite';
import { Button } from '../Button';

/**
 * Share-first lobby affordance. The report's top conversion lever for joins is
 * surfacing the invite link and code immediately, so hosts can pull family in
 * without hunting for a way to share. Copy feedback is announced through a
 * polite live region; the WhatsApp deep link and native Web Share cover the two
 * channels families actually use. The invite URL is always the canonical
 * `lazypatta.com/join/<code>` link (never `window.location.origin`) so a link
 * copied from a preview deploy still resolves for family days later — and so it
 * matches the path registered for mobile Universal Links / App Links.
 */

export function RoomSharePanel({
  code,
  locale,
  gameName,
  inviterName,
  occupiedSeats,
  maxPlayers,
}: {
  readonly code: string;
  readonly locale: Locale;
  readonly gameName?: string;
  readonly inviterName?: string;
  readonly occupiedSeats?: number;
  readonly maxPlayers?: number;
}): ReactElement {
  const translator = createTranslator(locale);
  const { t } = translator;
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const inviteUrl = buildRoomInviteUrl(code);
  const payload: FamilyInvitePayload = {
    roomCode: code,
    joinUrl: inviteUrl,
    gameName: gameName ?? t('rooms.gameGadhaChor'),
    inviterName,
    occupiedSeats,
    maxPlayers,
  };
  const displayUrl = inviteUrl;
  const inviteMessage = familyInviteText(payload, translator);
  const whatsappHref = whatsAppShareUrl(inviteMessage);

  const announceCopy = (kind: 'link' | 'code'): void => {
    if (kind === 'link') {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      return;
    }
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 2500);
  };

  const onCopy = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      announceCopy('link');
      trackGrowthEvent({ name: 'invite_shared', method: 'copy-link' });
    } catch {
      // Clipboard access can be blocked; the link stays visible for manual copy.
    }
  };

  const onCopyCode = async (): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      announceCopy('code');
      trackGrowthEvent({ name: 'invite_shared', method: 'copy-code' });
    } catch {
      // Room code remains visible for manual copy.
    }
  };

  const onNativeShare = async (): Promise<void> => {
    const result = await shareFamilyInvite({
      title: t('rooms.inviteTitle'),
      text: inviteMessage,
      url: inviteUrl,
    });
    if (result === 'native') {
      trackGrowthEvent({ name: 'invite_shared', method: 'native' });
    }
  };

  const onWhatsAppClick = (): void => {
    trackGrowthEvent({ name: 'invite_shared', method: 'whatsapp' satisfies ShareMethod });
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
          onClick={onWhatsAppClick}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md border border-action-primary px-4 text-sm font-semibold text-action-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {t('rooms.shareWhatsApp')}
        </a>
        <Button variant="ghost" size="sm" className="min-h-12 flex-1" onClick={onCopyCode}>
          {t('rooms.copyCode')}
        </Button>
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
        {copied ? t('rooms.linkCopied') : copiedCode ? t('rooms.codeCopied') : ''}
      </p>
    </section>
  );
}

export { RoomSharePanel as FamilyInviteShare };
