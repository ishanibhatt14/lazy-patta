import type { ReactElement } from 'react';

/**
 * A gold-ringed initials avatar. There are no accounts or uploaded photos in
 * Lazy Patta, so players are shown as warm monogram discs — used in the home
 * header, around the table, and in the rematch panel for one consistent look.
 */

export type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE: Record<AvatarSize, string> = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function PlayerAvatar({
  name,
  size = 'md',
  className,
}: {
  readonly name: string;
  readonly size?: AvatarSize;
  readonly className?: string;
}): ReactElement {
  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-action-secondary/70 bg-gradient-to-br from-brand-accent to-action-primary font-black text-text-onAccent shadow-sm ${SIZE[size]} ${className ?? ''}`}
    >
      {initials(name)}
    </span>
  );
}
