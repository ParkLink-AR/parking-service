import { blockedWindow, isDateBlocked, overlapsBlockedDates, upcomingBlockedDates } from '../../src/parking-spots/blocked-dates';
import { ba } from '../helpers';

const ranges = [{ from: '2026-10-20', to: '2026-10-22' }];

describe('blocked dates', () => {
  it('covers whole days, from the first midnight to the one after the last day', () => {
    const covered = blockedWindow(ranges[0]);
    expect(covered.start).toEqual(ba('2026-10-20'));
    expect(covered.end).toEqual(ba('2026-10-23'));
  });

  it('knows which days are closed, both ends included', () => {
    expect(isDateBlocked(ranges, '2026-10-19')).toBe(false);
    expect(isDateBlocked(ranges, '2026-10-20')).toBe(true);
    expect(isDateBlocked(ranges, '2026-10-22')).toBe(true);
    expect(isDateBlocked(ranges, '2026-10-23')).toBe(false);
    expect(isDateBlocked(null, '2026-10-20')).toBe(false);
  });

  it('a range overlaps when it touches any closed instant', () => {
    expect(overlapsBlockedDates(ranges, ba('2026-10-19', 22), ba('2026-10-20', 1))).toBe(true);
    expect(overlapsBlockedDates(ranges, ba('2026-10-19', 20), ba('2026-10-20'))).toBe(false);
    expect(overlapsBlockedDates(ranges, ba('2026-10-23'), ba('2026-10-23', 4))).toBe(false);
  });

  it('keeps only the ranges that have not ended, sorted', () => {
    jest.useFakeTimers().setSystemTime(ba('2026-10-21', 12));
    try {
      const upcoming = upcomingBlockedDates([
        { from: '2026-11-01', to: '2026-11-02' },
        { from: '2026-10-01', to: '2026-10-05' },
        { from: '2026-10-20', to: '2026-10-21' },
      ]);
      expect(upcoming).toEqual([
        { from: '2026-10-20', to: '2026-10-21' },
        { from: '2026-11-01', to: '2026-11-02' },
      ]);
    } finally {
      jest.useRealTimers();
    }
  });
});
