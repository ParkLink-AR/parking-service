import { NotFoundException } from '@nestjs/common';
import { AvailabilityService } from '../../src/availability/availability.service';
import { bookingClientWith, makeSpot, repoReturning, SPOT_ID } from '../fakes';
import { hours, window } from '../helpers';

// 2026-10-20 is a Tuesday (dayOfWeek 1); the spot opens 08-20 every day.
const everyDay = Array.from({ length: 7 }, (_, dayOfWeek) => ({ parkingSpotId: SPOT_ID, dayOfWeek, startHour: 8, endHour: 20 }));

function serviceWith(spot = makeSpot(), bookings: { start: Date; end: Date }[] = []) {
  const scheduleRepo = repoReturning(null);
  scheduleRepo.find.mockResolvedValue(everyDay);
  const service = new AvailabilityService(repoReturning(spot) as never, scheduleRepo as never, bookingClientWith(bookings) as never);
  return service;
}

describe('AvailabilityService.getAvailability', () => {
  it('a day without bookings is open all its published hours', async () => {
    const { days } = await serviceWith().getAvailability(SPOT_ID, '2026-10-20', '2026-10-21');
    expect(days).toEqual([
      { date: '2026-10-20', status: 'available', free_windows: [{ start: '2026-10-20T08:00:00-03:00', end: '2026-10-20T20:00:00-03:00' }] },
    ]);
  });

  it('takes the bookings out of the free windows', async () => {
    const { days } = await serviceWith(makeSpot(), [window('2026-10-20', 10, 12)]).getAvailability(SPOT_ID, '2026-10-20', '2026-10-21');
    const free = days[0].free_windows.map((w) => ({ start: new Date(w.start), end: new Date(w.end) }));
    expect(hours(free)).toEqual([[8, 10], [12, 20]]);
  });

  it('a fully booked day is full', async () => {
    const { days } = await serviceWith(makeSpot(), [window('2026-10-20', 8, 20)]).getAvailability(SPOT_ID, '2026-10-20', '2026-10-21');
    expect(days[0].status).toBe('full');
  });

  it('a day the owner closed by hand is closed, whatever the schedule says', async () => {
    const spot = makeSpot({ blockedDates: [{ from: '2026-10-21', to: '2026-10-21' }] });
    const { days } = await serviceWith(spot).getAvailability(SPOT_ID, '2026-10-20', '2026-10-23');
    expect(days.map((d) => [d.date, d.status])).toEqual([
      ['2026-10-20', 'available'],
      ['2026-10-21', 'closed'],
      ['2026-10-22', 'available'],
    ]);
  });

  it('a spot with two places stays available with one booking', async () => {
    const { days } = await serviceWith(makeSpot({ capacity: 2 }), [window('2026-10-20', 8, 20)]).getAvailability(
      SPOT_ID, '2026-10-20', '2026-10-21',
    );
    expect(days[0].status).toBe('available');
  });

  it('refuses ranges longer than two weeks, or backwards', async () => {
    await expect(serviceWith().getAvailability(SPOT_ID, '2026-10-01', '2026-11-01')).rejects.toThrow('exceeds maximum');
    await expect(serviceWith().getAvailability(SPOT_ID, '2026-10-21', '2026-10-20')).rejects.toThrow('before');
  });

  it("is not found for a spot that isn't published", async () => {
    const scheduleRepo = repoReturning(null);
    const service = new AvailabilityService(repoReturning(null) as never, scheduleRepo as never, bookingClientWith() as never);
    await expect(service.getAvailability(SPOT_ID, '2026-10-20', '2026-10-21')).rejects.toBeInstanceOf(NotFoundException);
  });
});
