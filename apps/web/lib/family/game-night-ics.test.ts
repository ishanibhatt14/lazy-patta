import { describe, expect, it } from 'vitest';

import { buildGameNightIcs, escapeIcsText, gameNightIcsDataUri, toIcsUtc } from './game-night-ics';

describe('toIcsUtc', () => {
  it('formats a date as a UTC iCalendar timestamp', () => {
    expect(toIcsUtc(new Date('2026-08-02T19:30:00Z'))).toBe('20260802T193000Z');
  });
});

describe('escapeIcsText', () => {
  it('escapes commas, semicolons, backslashes, and newlines', () => {
    expect(escapeIcsText('Bhatt, Family; night\nplan\\x')).toBe(
      'Bhatt\\, Family\\; night\\nplan\\\\x',
    );
  });
});

describe('buildGameNightIcs', () => {
  const start = new Date('2026-08-02T19:30:00Z');
  const now = new Date('2026-07-23T00:00:00Z');

  it('produces a valid single-event VCALENDAR with CRLF breaks', () => {
    const ics = buildGameNightIcs({ uid: 'night-1', title: 'Bhatt Family game night', start }, now);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:night-1@lazypatta.com');
    expect(ics).toContain('DTSTART:20260802T193000Z');
    // Default 120-minute duration.
    expect(ics).toContain('DTEND:20260802T213000Z');
    expect(ics).toContain('SUMMARY:Bhatt Family game night');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.split('\r\n').length).toBeGreaterThan(5);
  });

  it('includes an escaped description when provided', () => {
    const ics = buildGameNightIcs(
      { uid: 'n2', title: 'Game night', description: 'Lal Satti; bring chai', start },
      now,
    );
    expect(ics).toContain('DESCRIPTION:Lal Satti\\; bring chai');
  });

  it('omits the DESCRIPTION line when no description is given', () => {
    const ics = buildGameNightIcs({ uid: 'n3', title: 'Game night', start }, now);
    expect(ics).not.toContain('DESCRIPTION:');
  });

  it('honours a custom duration', () => {
    const ics = buildGameNightIcs(
      { uid: 'n4', title: 'Game night', start, durationMinutes: 30 },
      now,
    );
    expect(ics).toContain('DTEND:20260802T200000Z');
  });
});

describe('gameNightIcsDataUri', () => {
  it('encodes the calendar as a downloadable data URI', () => {
    const uri = gameNightIcsDataUri(
      { uid: 'n5', title: 'Game night', start: new Date('2026-08-02T19:30:00Z') },
      new Date('2026-07-23T00:00:00Z'),
    );
    expect(uri.startsWith('data:text/calendar;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(uri)).toContain('BEGIN:VCALENDAR');
  });
});
