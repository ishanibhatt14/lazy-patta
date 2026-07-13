import type { ReactElement } from 'react';

/**
 * Art placeholders for the immersive Gadha Chor table.
 *
 * These are deliberately simple, token-driven SVG/DOM stand-ins. They exist so
 * the redesign is fully composed and accessible today, while the final cohesive
 * illustrated art pack (Gujarati courtyard, Ba/Dada/Kaka/Kaki + cousins, the
 * Gadha mascot, a bespoke Bandhani card back, reaction icons) is produced and
 * approved separately. Swap the implementations behind these interfaces — no
 * caller changes required. Do NOT drop in mismatched stock illustrations.
 */

export type ReactionKind = 'pair' | 'finish' | 'draw' | 'cheer';

/** Contract each real asset must satisfy so placeholders swap out 1:1. */
export interface AvatarArtProps {
  /** Roster id (e.g. "ba", "kaka") or the human seat id. */
  readonly seatId: string;
  /** Localized/proper-noun initial glyph for the placeholder medallion. */
  readonly initial: string;
  readonly isSelf: boolean;
  readonly size?: number;
}

export interface MascotArtProps {
  readonly size?: number;
  /** Decorative by default; pass a label to expose it to assistive tech. */
  readonly label?: string;
}

export interface CardBackArtProps {
  readonly className?: string;
}

export interface ReactionIconProps {
  readonly kind: ReactionKind;
}

/** The eventual approved asset pack fulfils this shape. */
export interface ArtPack {
  readonly Avatar: (props: AvatarArtProps) => ReactElement;
  readonly Mascot: (props: MascotArtProps) => ReactElement;
  readonly CardBack: (props: CardBackArtProps) => ReactElement;
  readonly Backdrop: () => ReactElement;
  readonly ReactionIcon: (props: ReactionIconProps) => ReactElement;
}

// Warm, culturally-grounded accent per seat, drawn only from semantic tokens so
// a theme swap restyles every avatar. Keyed by roster id with a stable default.
const AVATAR_TONE: Record<string, string> = {
  you: 'bg-brand-accent',
  ba: 'bg-accent-kumkum',
  dada: 'bg-accent-indigo',
  kaka: 'bg-action-primary',
  kaki: 'bg-accent-indigo',
  masi: 'bg-accent-kumkum',
  mama: 'bg-game-table',
};

function toneFor(seatId: string, isSelf: boolean): string {
  if (isSelf) return AVATAR_TONE.you ?? 'bg-brand-accent';
  return AVATAR_TONE[seatId] ?? 'bg-action-primary';
}

/** Placeholder avatar: a festive medallion with the seat initial. */
export function AvatarPlaceholder({
  seatId,
  initial,
  isSelf,
  size = 48,
}: AvatarArtProps): ReactElement {
  return (
    <span
      aria-hidden
      className={[
        'inline-flex items-center justify-center rounded-full font-bold text-text-onBrand',
        'ring-2 ring-inset ring-white/30 shadow-md',
        toneFor(seatId, isSelf),
      ].join(' ')}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      data-art="avatar-placeholder"
    >
      {initial}
    </span>
  );
}

/** Placeholder Gadha mascot — an affectionate, minimal donkey silhouette. */
export function GadhaMascotPlaceholder({ size = 96, label }: MascotArtProps): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-art="mascot-placeholder"
    >
      <circle cx="48" cy="48" r="46" fill="var(--lp-scene-feltDeep)" />
      <circle
        cx="48"
        cy="48"
        r="46"
        fill="none"
        stroke="var(--lp-action-secondary)"
        strokeWidth="2"
      />
      {/* ears */}
      <path d="M34 30 Q30 14 38 20 L40 34 Z" fill="var(--lp-scene-rim)" />
      <path d="M62 30 Q66 14 58 20 L56 34 Z" fill="var(--lp-scene-rim)" />
      {/* head */}
      <ellipse cx="48" cy="52" rx="20" ry="22" fill="var(--lp-scene-rim)" />
      <ellipse cx="48" cy="66" rx="12" ry="10" fill="var(--lp-background-canvas)" />
      {/* eyes */}
      <circle cx="41" cy="48" r="2.6" fill="var(--lp-text-primary)" />
      <circle cx="55" cy="48" r="2.6" fill="var(--lp-text-primary)" />
      {/* nostrils */}
      <circle cx="44" cy="66" r="1.6" fill="var(--lp-text-primary)" />
      <circle cx="52" cy="66" r="1.6" fill="var(--lp-text-primary)" />
      {/* a small kumkum tilak, kept gentle */}
      <circle cx="48" cy="38" r="2.2" fill="var(--lp-accent-kumkum)" />
    </svg>
  );
}

/** Placeholder Bandhani-inspired card back (decorative). */
export function BandhaniCardBackPlaceholder({ className = '' }: CardBackArtProps): ReactElement {
  return (
    <span
      aria-hidden
      data-art="card-back-placeholder"
      className={['relative block overflow-hidden rounded-md', className].join(' ')}
      style={{
        background: 'var(--lp-card-back)',
        boxShadow:
          'inset 0 0 0 0.09rem color-mix(in srgb, var(--lp-action-secondary), transparent 45%)',
      }}
    >
      <span
        className="absolute inset-0"
        style={{
          opacity: 0.55,
          backgroundImage:
            'radial-gradient(circle, var(--lp-action-secondary) 0 0.045rem, transparent 0.05rem)',
          backgroundSize: '0.5rem 0.5rem',
          backgroundPosition: '0 0, 0.25rem 0.25rem',
        }}
      />
      <span
        className="absolute inset-[18%] rounded-sm"
        style={{
          border: '0.06rem solid color-mix(in srgb, var(--lp-action-secondary), transparent 30%)',
        }}
      />
    </span>
  );
}

/** Placeholder courtyard backdrop — subtle arch silhouettes over the sky. */
export function CourtyardBackdropPlaceholder(): ReactElement {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      data-art="backdrop-placeholder"
    >
      <svg
        className="absolute inset-x-0 bottom-0 h-2/5 w-full"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        <g fill="color-mix(in srgb, var(--lp-scene-rimEdge), transparent 45%)">
          <path d="M6 40 V18 Q10 8 14 18 V40 Z" />
          <path d="M22 40 V14 Q26 4 30 14 V40 Z" />
          <path d="M70 40 V14 Q74 4 78 14 V40 Z" />
          <path d="M86 40 V18 Q90 8 94 18 V40 Z" />
        </g>
      </svg>
    </div>
  );
}

const REACTION_GLYPH: Record<ReactionKind, string> = {
  pair: '✨',
  finish: '🎉',
  draw: '🂠',
  cheer: '👏',
};

/** Placeholder reaction icon (decorative glyph). */
export function ReactionIconPlaceholder({ kind }: ReactionIconProps): ReactElement {
  return (
    <span aria-hidden data-art="reaction-placeholder">
      {REACTION_GLYPH[kind]}
    </span>
  );
}

/** Default placeholder pack; the approved art pack will replace this export. */
export const placeholderArtPack: ArtPack = {
  Avatar: AvatarPlaceholder,
  Mascot: GadhaMascotPlaceholder,
  CardBack: BandhaniCardBackPlaceholder,
  Backdrop: CourtyardBackdropPlaceholder,
  ReactionIcon: ReactionIconPlaceholder,
};
