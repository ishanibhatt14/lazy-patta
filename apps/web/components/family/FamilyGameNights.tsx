'use client';

import { useEffect, useState, type FormEvent, type ReactElement } from 'react';

import {
  FAMILY_GAME_KEYS,
  familyGameNameKey,
  familyGameSlug,
} from '../../lib/family/family-game-labels';
import {
  cancelFamilyGameNight,
  fetchUpcomingFamilyGameNights,
  scheduleFamilyGameNight,
  type FamilyGameNight,
} from '../../lib/family/family-groups-client';
import { gameNightIcsDataUri } from '../../lib/family/game-night-ics';
import { trackGrowthEvent } from '../../lib/growth/analytics';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { type OnlineGameKey } from '../../lib/rooms/rooms-client';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';
import { Button } from '../Button';

/**
 * Scheduled game nights for a family (Release Train 2, PR 14). A game night is a
 * lightweight, forward-looking plan — "Sunday 8pm, Lal Satti" — that gives a
 * family a reason to come back. Mutations go through the SECURITY DEFINER RPCs in
 * lib/family; this component only reads (RLS-scoped) and calls those wrappers.
 *
 * The reminder is kept honestly: rather than promise a push the platform cannot
 * send, each night offers an "Add to calendar" link that downloads a standard
 * .ics file so the member's own device reminds them. No coins, no stakes — just a
 * shared plan to play cards together.
 */

interface FamilyGameNightsProps {
  readonly groupId: string;
  readonly familyName: string;
}

export function FamilyGameNights({ groupId, familyName }: FamilyGameNightsProps): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);

  const [nights, setNights] = useState<readonly FamilyGameNight[] | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [when, setWhen] = useState('');
  const [gameKey, setGameKey] = useState<OnlineGameKey | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | undefined>(undefined);
  const [scheduleError, setScheduleError] = useState(false);

  const load = async (): Promise<void> => {
    try {
      const upcoming = await fetchUpcomingFamilyGameNights(getSupabaseBrowserClient(), groupId);
      setNights(upcoming);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  useEffect(() => {
    let active = true;
    setNights(undefined);
    setLoadError(false);
    void (async () => {
      try {
        const upcoming = await fetchUpcomingFamilyGameNights(getSupabaseBrowserClient(), groupId);
        if (!active) return;
        setNights(upcoming);
      } catch {
        if (active) setLoadError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId]);

  const onSchedule = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!when) return;
    setBusy(true);
    setScheduleError(false);
    try {
      const scheduledFor = new Date(when).toISOString();
      await scheduleFamilyGameNight(getSupabaseBrowserClient(), groupId, {
        scheduledFor,
        gameKey: gameKey || null,
        note: note.trim() || null,
      });
      trackGrowthEvent({
        name: 'family_game_night_scheduled',
        ...(gameKey ? { gameSlug: familyGameSlug(gameKey) } : {}),
      });
      setWhen('');
      setGameKey('');
      setNote('');
      await load();
    } catch {
      setScheduleError(true);
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async (nightId: string): Promise<void> => {
    setCancellingId(nightId);
    try {
      await cancelFamilyGameNight(getSupabaseBrowserClient(), nightId);
      await load();
    } catch {
      setLoadError(true);
    } finally {
      setCancellingId(undefined);
    }
  };

  const calendarUri = (night: FamilyGameNight): string => {
    const title = t.format('family.gameNightCalendarTitle', { family: familyName });
    return gameNightIcsDataUri({
      uid: night.id,
      title,
      description: night.note ?? undefined,
      start: new Date(night.scheduled_for),
    });
  };

  const formatWhen = (iso: string): string =>
    new Date(iso).toLocaleString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-text-primary">{t.t('family.gameNightsHeading')}</h3>

      {loadError ? (
        <p className="text-sm text-status-error">{t.t('family.gameNightScheduleError')}</p>
      ) : nights === undefined ? (
        <p className="text-sm text-text-primary/70">{t.t('family.gameNightsHeading')}</p>
      ) : nights.length === 0 ? (
        <p className="text-sm text-text-primary/70">{t.t('family.gameNightsEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {nights.map((night) => (
            <li
              key={night.id}
              className="flex flex-col gap-1 rounded-md border border-action-primary/20 bg-background-canvas px-3 py-2"
            >
              <span className="font-semibold text-text-primary">
                {formatWhen(night.scheduled_for)}
              </span>
              {night.game_key ? (
                <span className="text-xs text-text-primary/70">
                  {t.t(familyGameNameKey(night.game_key))}
                </span>
              ) : (
                <span className="text-xs text-text-primary/70">
                  {t.t('family.gameNightGameAny')}
                </span>
              )}
              {night.note ? (
                <span className="text-xs italic text-text-primary/70">
                  {t.format('family.gameNightNoteLine', { note: night.note })}
                </span>
              ) : null}
              <div className="flex items-center gap-3 pt-1">
                <a
                  href={calendarUri(night)}
                  download={`game-night-${night.id}.ics`}
                  className="text-xs font-semibold text-action-primary underline"
                  onClick={() =>
                    trackGrowthEvent({
                      name: 'family_game_night_reminder_saved',
                      ...(night.game_key ? { gameSlug: familyGameSlug(night.game_key) } : {}),
                    })
                  }
                >
                  {t.t('family.gameNightAddToCalendar')}
                </a>
                <button
                  type="button"
                  className="text-xs font-semibold text-status-error underline disabled:opacity-60"
                  disabled={cancellingId === night.id}
                  onClick={() => void onCancel(night.id)}
                >
                  {cancellingId === night.id
                    ? t.t('family.gameNightCancelling')
                    : t.t('family.gameNightCancel')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="flex flex-col gap-2" onSubmit={onSchedule}>
        <label className="flex flex-col gap-1 text-xs text-text-primary">
          {t.t('family.gameNightWhenLabel')}
          <input
            type="datetime-local"
            required
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-sm text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-primary">
          {t.t('family.gameNightGameLabel')}
          <select
            value={gameKey}
            onChange={(e) => setGameKey(e.target.value as OnlineGameKey | '')}
            className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-sm text-text-primary"
          >
            <option value="">{t.t('family.gameNightGameAny')}</option>
            {FAMILY_GAME_KEYS.map((key) => (
              <option key={key} value={key}>
                {t.t(familyGameNameKey(key))}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-primary">
          {t.t('family.gameNightNoteLabel')}
          <input
            type="text"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.t('family.gameNightNotePlaceholder')}
            className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-sm text-text-primary"
          />
        </label>
        {scheduleError ? (
          <p className="text-xs text-status-error">{t.t('family.gameNightScheduleError')}</p>
        ) : null}
        <Button type="submit" variant="secondary" disabled={busy || when.length === 0}>
          {busy ? t.t('family.gameNightScheduling') : t.t('family.gameNightSubmit')}
        </Button>
      </form>
    </section>
  );
}
