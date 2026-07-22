import type { Locale } from '@lazy-patta/localization';
import type { CSSProperties, ReactElement } from 'react';

import type { HiddenCardSlot } from '../../../lib/computer-game/types';
import { createTranslator } from '../../../lib/i18n';
import { BandhaniCardBackPlaceholder } from '../art';

interface OpponentDrawFanProps {
  readonly locale: Locale;
  readonly slots: readonly HiddenCardSlot[];
  readonly onChooseCard: (positionToken: string) => void;
  readonly armedToken?: string | null;
}

const SPREAD_STEP_DEG = 7;
const MAX_SPREAD_DEG = 26;

function slotTransform(index: number, count: number): CSSProperties {
  if (count <= 1) return { transform: 'none' };
  const mid = (count - 1) / 2;
  const step = Math.min(SPREAD_STEP_DEG, (MAX_SPREAD_DEG * 2) / (count - 1));
  const angle = (index - mid) * step;
  const lift = Math.abs(index - mid) * 0.18;
  return {
    transform: `rotate(${angle}deg) translateY(${lift}rem)`,
    transformOrigin: 'bottom center',
  };
}

/**
 * The eligible opponent's hidden hand, extended toward the center as a natural
 * overlapping fan. Card identities are never present — each slot is an opaque
 * position token with an accessible owner+position label. Visible position
 * numbers are hidden; the position stays in the accessible name only. The whole
 * card plus invisible padding forms a comfortable (>=48px) touch target.
 */
export function OpponentDrawFan({
  locale,
  slots,
  onChooseCard,
  armedToken = null,
}: OpponentDrawFanProps): ReactElement | null {
  const { t, format } = createTranslator(locale);
  if (slots.length === 0) return null;
  const ownerName = slots.find((slot) => slot.isSelectable)?.ownerName ?? slots[0]?.ownerName ?? '';

  return (
    <div
      className="flex flex-col items-center justify-center gap-2"
      role="group"
      aria-label={t('computer.eligibleCards')}
    >
      {ownerName ? (
        <span className="gc-pick-cue rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
          {format('computer.pickFromCue', { name: ownerName })}
        </span>
      ) : null}

      <div className="flex items-end justify-center">
        {slots.map((slot, index) => (
          <span
            key={slot.positionToken}
            className="-ml-4 first:ml-0 inline-block"
            style={slotTransform(index, slots.length)}
          >
            <button
              type="button"
              disabled={!slot.isSelectable}
              onClick={() => onChooseCard(slot.positionToken)}
              className="gc-fan-card flex min-h-12 min-w-12 items-center justify-center rounded-lg p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:cursor-not-allowed disabled:opacity-80"
              aria-label={format('card.hiddenAccessible', {
                position: slot.displayIndex,
                name: slot.ownerName,
              })}
              data-position-token={slot.positionToken}
              data-selectable={slot.isSelectable ? 'true' : 'false'}
              data-armed={armedToken === slot.positionToken ? 'true' : 'false'}
            >
              <BandhaniCardBackPlaceholder className="h-16 w-12" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
