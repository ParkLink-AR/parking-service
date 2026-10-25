import {
  AvailabilityStatus,
  determineStatus,
  filterOverlapping,
  maxConcurrentBookings,
  subtractIntervals,
  subtractIntervalsWithCapacity,
} from '../../src/availability/interval-math';
import { ba, hours, window } from '../helpers';

const DAY = '2026-10-20';

describe('subtractIntervals', () => {
  it('leaves the free gaps around a booking', () => {
    const free = subtractIntervals([window(DAY, 8, 20)], [window(DAY, 10, 12)]);
    expect(hours(free)).toEqual([[8, 10], [12, 20]]);
  });

  it('merges overlapping bookings before subtracting', () => {
    const free = subtractIntervals([window(DAY, 8, 20)], [window(DAY, 10, 13), window(DAY, 12, 15)]);
    expect(hours(free)).toEqual([[8, 10], [15, 20]]);
  });

  it('returns nothing when a booking covers the whole window', () => {
    expect(subtractIntervals([window(DAY, 8, 12)], [window(DAY, 7, 13)])).toEqual([]);
  });

  it('ignores bookings outside the window and keeps split shifts apart', () => {
    const free = subtractIntervals([window(DAY, 8, 12), window(DAY, 16, 20)], [window(DAY, 13, 15)]);
    expect(hours(free)).toEqual([[8, 12], [16, 20]]);
  });
});

describe('subtractIntervalsWithCapacity', () => {
  it('keeps a slot free while fewer bookings than places overlap it', () => {
    const free = subtractIntervalsWithCapacity([window(DAY, 8, 20)], [window(DAY, 10, 12)], 2);
    expect(hours(free)).toEqual([[8, 20]]);
  });

  it('closes only where every place is taken', () => {
    const free = subtractIntervalsWithCapacity(
      [window(DAY, 8, 20)],
      [window(DAY, 10, 14), window(DAY, 12, 16)],
      2,
    );
    expect(hours(free)).toEqual([[8, 12], [14, 20]]);
  });

  it('with one place behaves exactly like subtractIntervals', () => {
    const base = [window(DAY, 8, 20)];
    const taken = [window(DAY, 9, 10), window(DAY, 15, 17)];
    expect(subtractIntervalsWithCapacity(base, taken, 1)).toEqual(subtractIntervals(base, taken));
  });
});

describe('filterOverlapping', () => {
  it('keeps what touches the range, half-open', () => {
    const bookings = [window(DAY, 6, 8), window(DAY, 7, 9), window(DAY, 20, 22)];
    expect(hours(filterOverlapping(bookings, window(DAY, 8, 20).start, window(DAY, 8, 20).end))).toEqual([[7, 9]]);
  });
});

describe('determineStatus', () => {
  it('is closed without published hours, full without free windows, available otherwise', () => {
    expect(determineStatus(true, [])).toBe(AvailabilityStatus.Closed);
    expect(determineStatus(false, [])).toBe(AvailabilityStatus.Full);
    expect(determineStatus(false, [window(DAY, 8, 9)])).toBe(AvailabilityStatus.Available);
  });
});

describe('maxConcurrentBookings', () => {
  // booking-service sends each booking padded by 15 minutes on both sides.
  const padded = (startHour: number, endHour: number) => ({
    start: new Date(ba('2026-10-20', startHour).getTime() - 15 * 60 * 1000),
    end: new Date(ba('2026-10-20', endHour).getTime() + 15 * 60 * 1000),
  });

  it('counts the bookings really running at once', () => {
    expect(maxConcurrentBookings([])).toBe(0);
    expect(maxConcurrentBookings([padded(8, 10), padded(9, 11), padded(9, 12)])).toBe(3);
    expect(maxConcurrentBookings([padded(8, 10), padded(11, 12)])).toBe(1);
  });

  it("doesn't count back-to-back bookings as overlapping, even with their padding", () => {
    // 08-10 and 10:15-11: the 15 minutes apart the rules keep between them.
    const second = { start: new Date(ba('2026-10-20', 10).getTime()), end: new Date(ba('2026-10-20', 11, 15).getTime()) };
    expect(maxConcurrentBookings([padded(8, 10), second])).toBe(1);
  });
});
