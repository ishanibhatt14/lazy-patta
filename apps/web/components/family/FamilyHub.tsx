'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';

import { useAuth } from '../../lib/auth/auth-context';
import {
  createFamilyGroup,
  fetchMyFamilyGroups,
  joinFamilyGroupByCode,
  type FamilyGroup,
} from '../../lib/family/family-groups-client';
import { trackGrowthEvent } from '../../lib/growth/analytics';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';
import { Button } from '../Button';
import { LoginPanel } from '../auth/LoginPanel';

/**
 * Signed-in landing for Family Groups: see the families you belong to, start a
 * new one, or join by code. A family is an optional, persistent circle that
 * outlives any single room. Mutations go through the SECURITY DEFINER RPCs in
 * lib/family; this component only reads its own memberships (RLS-scoped) and
 * calls those wrappers. Degrades gracefully when Supabase is unconfigured.
 */

export function FamilyHub(): ReactElement {
  const { state, configured } = useAuth();
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);

  const [families, setFamilies] = useState<readonly FamilyGroup[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const viewFired = useRef(false);

  const signedIn = state.status === 'signed-in';

  useEffect(() => {
    if (!configured || !signedIn) return;
    let active = true;
    void (async () => {
      try {
        const groups = await fetchMyFamilyGroups(getSupabaseBrowserClient());
        if (!active) return;
        setFamilies(groups);
        setLoadError(false);
        if (!viewFired.current) {
          viewFired.current = true;
          trackGrowthEvent({ name: 'family_hub_viewed', familyCount: groups.length });
        }
      } catch {
        if (active) setLoadError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [configured, signedIn]);

  if (!configured) {
    return (
      <div className="flex flex-col gap-3 rounded-lg bg-surface-primary p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">
          {t.t('family.unavailableTitle')}
        </h2>
        <p className="text-sm text-text-primary">{t.t('family.unavailableBody')}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          {t.t('action.tryAgain')}
        </Button>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="flex flex-col items-center gap-4">
        <LoginPanel />
      </div>
    );
  }

  const reload = async (): Promise<void> => {
    try {
      const groups = await fetchMyFamilyGroups(getSupabaseBrowserClient());
      setFamilies(groups);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  const onCreate = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy('create');
    setError(undefined);
    try {
      trackGrowthEvent({ name: 'family_group_create_started' });
      await createFamilyGroup(getSupabaseBrowserClient(), {
        name: name.trim(),
        displayName: displayName.trim() || undefined,
      });
      trackGrowthEvent({ name: 'family_group_created' });
      setName('');
      setDisplayName('');
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(undefined);
    }
  };

  const onJoin = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy('join');
    setError(undefined);
    try {
      trackGrowthEvent({ name: 'family_group_join_started' });
      await joinFamilyGroupByCode(
        getSupabaseBrowserClient(),
        code.trim(),
        displayName.trim() || undefined,
      );
      trackGrowthEvent({ name: 'family_group_joined' });
      setCode('');
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-lg bg-surface-primary p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">{t.t('family.hubTitle')}</h2>
        <p className="text-sm text-text-primary">{t.t('family.hubDescription')}</p>
        {loadError ? (
          <p className="text-sm text-status-error">{t.t('family.loadError')}</p>
        ) : families.length === 0 ? (
          <p className="text-sm text-text-primary">{t.t('family.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {families.map((family) => (
              <li
                key={family.id}
                className="flex items-center justify-between rounded-md border border-action-primary/20 bg-background-canvas px-3 py-2"
              >
                <span className="font-semibold text-text-primary">{family.name}</span>
                <span className="text-xs uppercase tracking-wide text-text-primary/70">
                  {t.format('family.codeOnCard', { code: family.join_code })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        className="flex flex-col gap-3 rounded-lg bg-surface-primary p-6 shadow-sm"
        onSubmit={onCreate}
      >
        <h2 className="text-lg font-semibold text-text-primary">{t.t('family.createTitle')}</h2>
        <p className="text-sm text-text-primary">{t.t('family.createDescription')}</p>
        <label className="flex flex-col gap-1 text-sm text-text-primary">
          {t.t('family.nameLabel')}
          <input
            type="text"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.t('family.namePlaceholder')}
            className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-text-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-primary">
          {t.t('family.displayNameLabel')}
          <input
            type="text"
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t.t('family.displayNamePlaceholder')}
            className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-text-primary"
          />
        </label>
        <Button type="submit" disabled={busy !== undefined || name.trim().length === 0}>
          {busy === 'create' ? t.t('family.creating') : t.t('family.create')}
        </Button>
      </form>

      <form
        className="flex flex-col gap-3 rounded-lg bg-surface-primary p-6 shadow-sm"
        onSubmit={onJoin}
      >
        <h2 className="text-lg font-semibold text-text-primary">{t.t('family.joinTitle')}</h2>
        <p className="text-sm text-text-primary">{t.t('family.joinDescription')}</p>
        <label className="flex flex-col gap-1 text-sm text-text-primary">
          {t.t('family.codeLabel')}
          <input
            type="text"
            required
            autoCapitalize="characters"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
            placeholder={t.t('family.codePlaceholder')}
            className="rounded-md border border-action-primary/30 bg-background-canvas px-3 py-2 text-center text-lg font-semibold tracking-[0.3em] text-text-primary"
          />
        </label>
        <Button
          type="submit"
          variant="secondary"
          disabled={busy !== undefined || code.trim().length < 6}
        >
          {busy === 'join' ? t.t('family.joining') : t.t('family.join')}
        </Button>
      </form>

      {error ? <p className="text-center text-sm text-status-error">{error}</p> : null}
    </div>
  );
}
