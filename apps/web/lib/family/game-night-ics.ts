/**
 * Build an iCalendar (.ics) event for a family game night. This is how PR 14
 * keeps its reminder promise honestly: rather than claim a push/SMS the platform
 * cannot send, the client hands the user a standard calendar file their own
 * device reminds them about. Pure and framework-free so it is unit-testable and
 * usable from any surface.
 */

export interface GameNightEvent {
  /** Stable unique id for the VEVENT (the game-night row id works well). */
  readonly uid: string;
  /** Localized calendar title, e.g. "Bhatt Family game night". */
  readonly title: string;
  /** Optional localized description (game, note). */
  readonly description?: string;
  /** Event start. */
  readonly start: Date;
  /** How long to block on the calendar; defaults to 120 minutes. */
  readonly durationMinutes?: number;
}

/** Format a Date as an iCalendar UTC timestamp: YYYYMMDDTHHMMSSZ. */
export function toIcsUtc(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Escape a text value per RFC 5545 (backslash, comma, semicolon, newline). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** Build a complete VCALENDAR document for a single game-night event. */
export function buildGameNightIcs(event: GameNightEvent, now: Date = new Date()): string {
  const durationMs = (event.durationMinutes ?? 120) * 60_000;
  const end = new Date(event.start.getTime() + durationMs);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lazy Patta//Family Game Night//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.uid}@lazypatta.com`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(event.start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  // RFC 5545 mandates CRLF line breaks.
  return lines.join('\r\n');
}

/** A data: URI the browser can download as an .ics file (no server round-trip). */
export function gameNightIcsDataUri(event: GameNightEvent, now: Date = new Date()): string {
  const ics = buildGameNightIcs(event, now);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
