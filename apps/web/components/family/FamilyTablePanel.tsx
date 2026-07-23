'use client';

import { useEffect, useState, type ReactElement } from 'react';

import { familyGameNameKey, familyPresetLabelKey } from '../../lib/family/family-game-labels';
import {
  fetchFamilyFavoriteGames,
  fetchFamilyRecentTables,
  fetchFamilySeriesResults,
  type FamilyFavoriteGame,
  type FamilyRecentTable,
  type FamilySeriesResult,
} from '../../lib/family/family-groups-client';
import { trackGrowthEvent } from '../../lib/growth/analytics';
import { createTranslator } from '../../lib/i18n';
import { usePreferredLocale } from '../../lib/locale/preferred-locale-context';
import { getSupabaseBrowserClient } from '../../lib/supabase/browser-client';

/**
 * The Family Table social layer (Release Train 2, PR 13). A read-only view of
 * the durable things a family keeps between game nights — favourite games (with
 * the house-rule variant they play), recently-visited tables, and past series
 * winners. Everything here is RLS-scoped to families the caller belongs to; this
 * panel only reads through the lib/family wrappers and never mutates. Non-casino
 * by construction: it celebrates shared play and history, never stakes or coins.
 */

interface FamilyTablePanelProps {
  readonly groupId: string;
}

interface Activity {
  readonly favorites: readonly FamilyFavoriteGame[];
  readonly recentTables: readonly FamilyRecentTable[];
  readonly series: readonly FamilySeriesResult[];
}

export function FamilyTablePanel({ groupId }: FamilyTablePanelProps): ReactElement {
  const { locale } = usePreferredLocale();
  const t = createTranslator(locale);

  const [activity, setActivity] = useState<Activity | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setActivity(undefined);
    setLoadError(false);
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        const [favorites, recentTables, series] = await Promise.all([
          fetchFamilyFavoriteGames(client, groupId),
          fetchFamilyRecentTables(client, groupId),
          fetchFamilySeriesResults(client, groupId),
        ]);
        if (!active) return;
        setActivity({ favorites, recentTables, series });
        trackGrowthEvent({ name: 'family_detail_viewed', favoriteCount: favorites.length });
      } catch {
        if (active) setLoadError(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId]);

  if (loadError) {
    return <p className="text-sm text-status-error">{t.t('family.tableLoadError')}</p>;
  }
  if (!activity) {
    return <p className="text-sm text-text-primary/70">{t.t('family.tableLoadError')}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text-primary">
          {t.t('family.favouritesHeading')}
        </h3>
        {activity.favorites.length === 0 ? (
          <p className="text-sm text-text-primary/70">{t.t('family.favouritesEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {activity.favorites.map((favorite) => {
              const presetKey = familyPresetLabelKey(favorite.game_key, favorite.ruleset_preset);
              return (
                <li
                  key={favorite.game_key}
                  className="flex flex-col rounded-md border border-action-primary/20 bg-background-canvas px-3 py-2"
                >
                  <span className="font-semibold text-text-primary">
                    {t.t(familyGameNameKey(favorite.game_key))}
                  </span>
                  {presetKey ? (
                    <span className="text-xs text-text-primary/70">
                      {t.format('family.housRulesTag', { preset: t.t(presetKey) })}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text-primary">
          {t.t('family.recentTablesHeading')}
        </h3>
        {activity.recentTables.length === 0 ? (
          <p className="text-sm text-text-primary/70">{t.t('family.recentTablesEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {activity.recentTables.map((table) => (
              <li
                key={table.id}
                className="flex items-center justify-between rounded-md border border-action-primary/20 bg-background-canvas px-3 py-2"
              >
                <span className="text-sm text-text-primary">
                  {t.t(familyGameNameKey(table.game_key))}
                </span>
                <span className="text-xs uppercase tracking-wide text-text-primary/70">
                  {t.format('family.tableCodeLine', { code: table.room_code })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-text-primary">{t.t('family.seriesHeading')}</h3>
        {activity.series.length === 0 ? (
          <p className="text-sm text-text-primary/70">{t.t('family.seriesEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {activity.series.map((result) => (
              <li
                key={result.id}
                className="flex flex-col rounded-md border border-action-primary/20 bg-background-canvas px-3 py-2"
              >
                <span className="font-semibold text-text-primary">
                  {t.t(familyGameNameKey(result.game_key))}
                </span>
                <span className="text-xs text-text-primary/70">
                  {result.winner_display_name
                    ? t.format('family.seriesWinnerLine', { name: result.winner_display_name })
                    : t.t('family.seriesNoWinner')}
                  {result.rounds_played != null
                    ? ` · ${t.format('family.seriesRounds', { count: result.rounds_played })}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
