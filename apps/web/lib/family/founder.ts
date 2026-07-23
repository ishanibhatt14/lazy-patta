/**
 * Founder families (Release Train 2, PR 15). The earliest families to form on
 * Lazy Patta are the ones who shape it — we recognise them with a lightweight
 * "founder" badge. This is derived purely from a family's creation date against
 * a fixed launch-window cutoff: no server flag, no ranking, no reward beyond the
 * badge itself. Kept free of React and Supabase so the rule is unit-testable.
 */

/**
 * Families created on or before this instant are founders. Set to the close of
 * Release Train 2's founder window; families that join afterwards are regular
 * members (still first-class in every other way).
 */
export const FOUNDER_WINDOW_CLOSES = new Date('2026-12-31T23:59:59.999Z');

/** Whether a family created at `createdAt` falls inside the founder window. */
export function isFounderFamily(
  createdAt: string | Date | null | undefined,
  windowCloses: Date = FOUNDER_WINDOW_CLOSES,
): boolean {
  if (!createdAt) return false;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return created.getTime() <= windowCloses.getTime();
}
