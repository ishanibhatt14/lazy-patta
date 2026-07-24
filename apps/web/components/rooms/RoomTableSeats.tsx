import type { ReactElement, ReactNode } from 'react';

import type { Translator } from '../../lib/i18n';
import { AvatarPlaceholder } from '../game/art';
import { PatternBackground } from '../mobile/artwork/PatternBackground';

/** A render-safe seat projection — no Supabase row shape leaks into the view. */
export interface LobbyTableSeat {
  readonly id: string;
  readonly occupant: 'empty' | 'human' | 'bot';
  readonly displayName: string | null;
  readonly isReady: boolean;
  readonly isYou: boolean;
  readonly isHost: boolean;
}

function seatName(seat: LobbyTableSeat, t: Translator): string {
  if (seat.displayName && seat.displayName.trim()) return seat.displayName.trim();
  if (seat.occupant === 'bot') return t.t('rooms.seatBot');
  if (seat.occupant === 'human') return t.t('rooms.seatPlayer');
  return t.t('rooms.seatEmpty');
}

function initialFor(name: string): string {
  const first = name.trim().charAt(0);
  return first ? first.toUpperCase() : '?';
}

/**
 * The lobby seat list, framed as a table people are gathering around rather than
 * a plain form list: a warm surface floating on the felt mat, each taken seat a
 * festive avatar with a host crown and a ready pill, and each open seat a gently
 * pulsing "saving a seat" placeholder (still, not animated, under reduced
 * motion). Purely presentational — the safety menu is injected per seat so this
 * component stays decoupled from the room client.
 */
export function RoomTableSeats({
  seats,
  t,
  safetyMenuFor,
}: {
  readonly seats: readonly LobbyTableSeat[];
  readonly t: Translator;
  readonly safetyMenuFor?: (seatId: string) => ReactNode;
}): ReactElement {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-game-table p-3 shadow-md">
      <PatternBackground className="text-text-onAccent" opacity={0.06} />
      <div className="relative z-10 rounded-2xl border border-action-primary/10 bg-surface-primary px-4 py-4 shadow-sm">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-action-primary">
          {t.t('rooms.tableHeading')}
        </h2>
        <ul className="flex flex-col gap-2">
          {seats.map((seat) => {
            if (seat.occupant === 'empty') {
              return (
                <li
                  key={seat.id}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-action-primary/30 px-3 py-2.5"
                >
                  <span
                    aria-hidden
                    className="h-11 w-11 shrink-0 animate-pulse rounded-full border-2 border-dashed border-action-primary/40 motion-reduce:animate-none"
                  />
                  <span className="text-sm font-semibold text-text-primary/70">
                    {t.t('rooms.seatSaving')}
                  </span>
                </li>
              );
            }

            const name = seatName(seat, t);
            return (
              <li
                key={seat.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-background-canvas px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="relative shrink-0">
                    <AvatarPlaceholder
                      seatId={seat.id}
                      initial={initialFor(name)}
                      isSelf={seat.isYou}
                      size={44}
                    />
                    {seat.isHost ? (
                      <span
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-action-secondary text-[0.7rem] shadow-sm"
                        aria-label={t.t('rooms.host')}
                        title={t.t('rooms.host')}
                      >
                        <span aria-hidden>👑</span>
                      </span>
                    ) : null}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold text-text-primary">
                      {name}
                      {seat.isYou ? ` (${t.t('rooms.you')})` : ''}
                    </span>
                    <span className="text-xs font-semibold text-text-primary/60">
                      {seat.isHost
                        ? t.t('rooms.host')
                        : seat.occupant === 'bot'
                          ? t.t('rooms.seatBot')
                          : t.t('rooms.seatPlayer')}
                    </span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={[
                      'rounded-full px-2.5 py-1 text-xs font-bold',
                      seat.isReady
                        ? 'bg-brand-accent text-text-onBrand'
                        : 'bg-action-primary/10 text-action-primary',
                    ].join(' ')}
                  >
                    {seat.isReady ? t.t('rooms.ready') : t.t('rooms.notReady')}
                  </span>
                  {safetyMenuFor ? safetyMenuFor(seat.id) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
