'use client';

import type { ReactElement, ReactNode } from 'react';

import { CourtyardBackdropPlaceholder } from '../art';

import './immersive-scene.css';

interface ImmersiveSceneProps {
  /** Accessible label for the scene section (usually the game's mode label). */
  readonly ariaLabel: string;
  /** Small uppercase eyebrow over the live status (e.g. "Computer game"). */
  readonly modeLabel: string;
  /** The single live turn/status line — the only role="status" on the table. */
  readonly statusText: string;
  /** Lotus vs hourglass glyph: true when it is the human's turn. */
  readonly statusIsSelf?: boolean;
  /** Right-aligned top-bar controls (settings gear, scores, etc.). */
  readonly toolbar: ReactNode;
  readonly top: ReactNode;
  readonly middle: ReactNode;
  readonly bottom: ReactNode;
  /** Absolutely-positioned overlay layer (result celebration, error panel). */
  readonly overlay?: ReactNode;
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
}

/**
 * The shared premium courtyard table used by the newer boards (Jhabbu,
 * Kachuful). It provides the evening-sky shell, the wooden-rim felt with its
 * bandhani lattice, a compact top bar (mode eyebrow + one live status +
 * on-demand controls), and three stacked regions (opponents / play zone /
 * self + hand). It is presentation only: callers pass their own pods, play
 * zone, hand, and result overlay, and every animation collapses under reduced
 * motion. Gadha Chor and Lal Satti keep their own hand-tuned shells; this is
 * additive so those two are never disturbed.
 */
export function ImmersiveScene({
  ariaLabel,
  modeLabel,
  statusText,
  statusIsSelf = false,
  toolbar,
  top,
  middle,
  bottom,
  overlay,
  reducedMotion = false,
  highContrast = false,
}: ImmersiveSceneProps): ReactElement {
  return (
    <main
      className="imm-shell"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-high-contrast={highContrast ? 'true' : 'false'}
    >
      <CourtyardBackdropPlaceholder />

      <div className="relative z-10 px-3 pt-2">
        <header className="flex items-center justify-between gap-3 px-1 py-1">
          <div className="flex min-w-0 flex-col">
            <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-text-onBrand/70">
              {modeLabel}
            </span>
            <div
              className="flex items-center gap-1.5 text-sm font-bold text-text-onBrand"
              role="status"
              aria-live="polite"
            >
              <span aria-hidden>{statusIsSelf ? '🪷' : '⏳'}</span>
              <span className="truncate">{statusText}</span>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">{toolbar}</div>
        </header>
      </div>

      <section className="imm-scene" aria-label={ariaLabel}>
        <div className="imm-felt">
          <div className="imm-felt-pattern" aria-hidden />
          <div className="imm-felt-border" aria-hidden />
        </div>

        <div className="imm-regions">
          <div className="imm-region-top">{top}</div>
          <div className="imm-region-middle">{middle}</div>
          <div className="imm-region-bottom">{bottom}</div>
        </div>

        {overlay}
      </section>
    </main>
  );
}
