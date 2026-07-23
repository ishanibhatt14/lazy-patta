'use client';

import type { Locale, MessageKey } from '@lazy-patta/localization';
import { useState, type ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import {
  REPORT_REASONS,
  blockPlayer,
  reportPlayer,
  unblockPlayer,
  type ReportReason,
} from '../../lib/rooms/moderation-client';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';
import { Button } from '../Button';

const REASON_LABEL_KEY: Record<ReportReason, MessageKey> = {
  abuse: 'rooms.reportReasonAbuse',
  cheating: 'rooms.reportReasonCheating',
  inappropriate_name: 'rooms.reportReasonInappropriateName',
  spam: 'rooms.reportReasonSpam',
  other: 'rooms.reportReasonOther',
};

/**
 * Per-opponent safety affordance for the lobby: a quiet disclosure that offers
 * "Report" (opens a small reason picker) and "Block"/"Unblock". Both flow
 * through the moderation RPCs, which stamp the caller server-side. The tone is
 * deliberately low-key — this is a family table, not a moderation console — but
 * the exit is always one tap away.
 */
export function PlayerSafetyMenu({
  reportedUserId,
  name,
  roomId,
  locale,
  isBlocked,
  onBlockChange,
}: {
  readonly reportedUserId: string;
  readonly name: string;
  readonly roomId: string;
  readonly locale: Locale;
  readonly isBlocked: boolean;
  readonly onBlockChange?: () => void;
}): ReactElement {
  const t = createTranslator(locale);
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ReportReason>('abuse');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = getSupabaseBrowserClient;

  const submitReport = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await reportPlayer(client(), { reportedUserId, reason, roomId });
      setNote(t.t('rooms.reportSent'));
      setReporting(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.t('rooms.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      if (isBlocked) {
        await unblockPlayer(client(), reportedUserId);
        setNote(null);
      } else {
        await blockPlayer(client(), reportedUserId);
        setNote(t.format('rooms.blockDone', { name }));
      }
      onBlockChange?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.t('rooms.errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex flex-col items-end gap-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.format('rooms.safetyFor', { name })}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md px-2 py-1 text-lg leading-none text-text-primary/70 transition hover:bg-background-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
      >
        ⋯
      </button>

      {isBlocked ? (
        <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-status-error">
          {t.t('rooms.blockedLabel')}
        </span>
      ) : null}

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-9 z-10 flex w-56 flex-col gap-2 rounded-md border border-brand-accent/30 bg-surface-primary p-3 shadow-lg"
        >
          {reporting ? (
            <div
              className="flex flex-col gap-2"
              aria-label={t.format('rooms.reportTitle', { name })}
            >
              <p className="text-sm font-bold text-action-primary">
                {t.format('rooms.reportTitle', { name })}
              </p>
              <p className="text-xs text-text-primary">{t.t('rooms.reportHint')}</p>
              <fieldset className="flex flex-col gap-1">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm text-text-primary">
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                    />
                    {t.t(REASON_LABEL_KEY[r])}
                  </label>
                ))}
              </fieldset>
              <Button size="sm" disabled={busy} onClick={() => void submitReport()}>
                {t.t('rooms.reportSubmit')}
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => {
                  setReporting(true);
                  setNote(null);
                }}
              >
                {t.t('rooms.report')}
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void toggleBlock()}>
                {isBlocked ? t.t('rooms.unblock') : t.t('rooms.block')}
              </Button>
            </>
          )}

          {note ? <p className="text-xs font-semibold text-brand-accent">{note}</p> : null}
          {error ? <p className="text-xs font-semibold text-status-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
