import type { Locale } from '@lazy-patta/localization';
import Link from 'next/link';
import type { ReactElement } from 'react';

import { createTranslator } from '../../lib/i18n';
import { Button } from '../Button';

export interface GameCardProps {
  readonly locale: Locale;
  readonly name: string;
  readonly description: string;
  /** `available` shows live buttons; `comingSoon` disables Play Online. */
  readonly status: 'available' | 'comingSoon';
  readonly computerHref: string;
  /** Omit (or leave undefined) when online play isn't built yet — renders a disabled state. */
  readonly onlineHref?: string;
  readonly onHowToPlay: () => void;
  /** Omit on the game's own overview page — the title just renders as text there. */
  readonly overviewHref?: string;
}

const PRIMARY_LINK_CLASSES =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-action-primary px-4 py-2 text-sm font-semibold text-text-onBrand transition hover:brightness-110';
const SECONDARY_LINK_CLASSES =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-action-primary px-4 py-2 text-sm font-semibold text-action-primary transition hover:bg-action-primary hover:text-text-onBrand';
const DISABLED_CLASSES =
  'inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-action-primary/20 px-4 py-2 text-sm font-semibold text-text-primary/40';

/** One game's card on the lobby home page — status, description, and the three entry points. */
export function GameCard({
  locale,
  name,
  description,
  status,
  computerHref,
  onlineHref,
  onHowToPlay,
  overviewHref,
}: GameCardProps): ReactElement {
  const { t } = createTranslator(locale);

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-surface-primary p-6 text-left shadow-sm">
      <div className="flex items-center justify-between gap-3">
        {overviewHref ? (
          <Link
            href={overviewHref}
            className="text-xl font-bold text-text-primary hover:text-action-primary"
          >
            {name}
          </Link>
        ) : (
          <h2 className="text-xl font-bold text-text-primary">{name}</h2>
        )}
        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
            status === 'available'
              ? 'bg-brand-accent/20 text-brand-accent'
              : 'bg-background-canvas text-text-primary/60',
          ].join(' ')}
        >
          {status === 'available' ? t('games.status.available') : t('games.status.comingSoon')}
        </span>
      </div>

      <p className="text-sm text-text-primary">{description}</p>

      <div className="flex flex-wrap gap-2">
        <Link href={computerHref} className={PRIMARY_LINK_CLASSES}>
          {t('action.playComputer')}
        </Link>
        {onlineHref ? (
          <Link href={onlineHref} className={SECONDARY_LINK_CLASSES}>
            {t('action.playOnline')}
          </Link>
        ) : (
          <span className={DISABLED_CLASSES} aria-disabled="true">
            {t('action.playOnline')} · {t('games.status.comingSoon')}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onHowToPlay}>
          {t('action.howToPlay')}
        </Button>
      </div>
    </div>
  );
}
