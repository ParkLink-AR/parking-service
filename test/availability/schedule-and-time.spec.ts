import {
  addOneDay, buenosAiresMidnight, buenosAiresToday, datesInRange, formatBuenosAires, isPastCheckIn,
} from '../../src/availability/buenos-aires-time';
import { publishedWindowsForDay } from '../../src/availability/published-schedule';
import { ba, hours } from '../helpers';

describe('Buenos Aires time', () => {
  it('midnight is 03:00 UTC', () => {
    expect(buenosAiresMidnight('2026-10-20').toISOString()).toBe('2026-10-20T03:00:00.000Z');
  });

  it("today follows Buenos Aires, not UTC: 01:00 UTC is still yesterday", () => {
    expect(buenosAiresToday(new Date('2026-10-21T01:00:00Z'))).toBe('2026-10-20');
  });

  it('adds a day across month ends', () => {
    expect(addOneDay('2026-10-31')).toBe('2026-11-01');
  });

  it('lists the days of a range, end excluded', () => {
    expect([...datesInRange('2026-10-30', '2026-11-02')]).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });

  it('formats with the -03:00 offset', () => {
    expect(formatBuenosAires(new Date('2026-10-20T12:00:00Z'))).toBe('2026-10-20T09:00:00-03:00');
  });
});

describe('publishedWindowsForDay', () => {
  // 0 = Monday ... 6 = Sunday. 2026-10-20 is a Tuesday.
  const schedule = [
    { dayOfWeek: 1, startHour: 8, endHour: 12 },
    { dayOfWeek: 1, startHour: 14, endHour: 20 },
    { dayOfWeek: 6, startHour: 0, endHour: 24 },
  ];

  it("returns that weekday's windows, split shifts included", () => {
    expect(hours(publishedWindowsForDay(schedule, '2026-10-20'))).toEqual([[8, 12], [14, 20]]);
  });

  it('returns nothing on a day the spot is closed', () => {
    expect(publishedWindowsForDay(schedule, '2026-10-21')).toEqual([]);
  });

  it('a 24-hour day goes from midnight to midnight', () => {
    expect(hours(publishedWindowsForDay(schedule, '2026-10-25'))).toEqual([[0, 24]]);
  });
});

describe('isPastCheckIn', () => {
  const now = ba('2026-10-24', 12, 56);

  it('is true for an hour already gone, false for the one under way and later', () => {
    expect(isPastCheckIn(ba('2026-10-24', 2), now)).toBe(true);
    expect(isPastCheckIn(ba('2026-10-24', 11), now)).toBe(true);
    expect(isPastCheckIn(ba('2026-10-24', 12), now)).toBe(false);
    expect(isPastCheckIn(ba('2026-10-24', 13), now)).toBe(false);
    expect(isPastCheckIn(ba('2026-10-25', 2), now)).toBe(false);
  });
});
