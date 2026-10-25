import { BadRequestException, ConflictException } from '@nestjs/common';
import { StaysService } from '../../src/stays/stays.service';
import { VehicleType } from '../../src/parking-spots/vehicle-type';
import { bookingClientWith, makeSpot, repoReturning, SPOT_ID } from '../fakes';
import { ba } from '../helpers';

function serviceWith(spot = makeSpot(), bookings: { start: Date; end: Date }[] = []) {
  return new StaysService(repoReturning(spot) as never, bookingClientWith(bookings) as never);
}

describe('StaysService.getQuote', () => {
  beforeAll(() => jest.useFakeTimers().setSystemTime(ba('2026-10-15', 12)));
  afterAll(() => jest.useRealTimers());

  it('prices months, weeks and days, biggest first, in centavos', async () => {
    // 39 days = 1 month (30) + 1 week (7) + 2 days.
    const quote = await serviceWith().getQuote(SPOT_ID, '2026-10-20', '2026-11-28', 10);
    expect(quote.totalDays).toBe(39);
    expect(quote.breakdown).toEqual({ months: 1, weeks: 1, days: 2 });
    expect(quote.amount).toBe((200000 + 60000 + 2 * 10000) * 100);
  });

  it('checks in and out at the same hour', async () => {
    const quote = await serviceWith().getQuote(SPOT_ID, '2026-10-20', '2026-10-22', 9);
    expect(quote.startDateTime).toBe('2026-10-20T09:00:00-03:00');
    expect(quote.endDateTime).toBe('2026-10-22T09:00:00-03:00');
  });

  // The booking that started this: at 12:56, a stay "from today at 02:00" was quoted as a full
  // day and then booked from 12:56 -- a full day paid for 13 hours.
  it("refuses a check-in hour that already went by today, not the one under way", async () => {
    // It's 12:00 (fake time): 09:00 is gone, 12:00 is the hour under way, 15:00 is ahead.
    await expect(serviceWith().getQuote(SPOT_ID, '2026-10-15', '2026-10-16', 9)).rejects.toThrow('ya pasó');
    await expect(serviceWith().getQuote(SPOT_ID, '2026-10-15', '2026-10-16', 2)).rejects.toBeInstanceOf(BadRequestException);
    const underWay = await serviceWith().getQuote(SPOT_ID, '2026-10-15', '2026-10-16', 12);
    expect(underWay.startDateTime).toBe('2026-10-15T12:00:00-03:00');
    const later = await serviceWith().getQuote(SPOT_ID, '2026-10-15', '2026-10-16', 15);
    expect(later.endDateTime).toBe('2026-10-16T15:00:00-03:00');
  });

  it('refuses a stay over a day the owner closed', async () => {
    const spot = makeSpot({ blockedDates: [{ from: '2026-10-21', to: '2026-10-21' }] });
    await expect(serviceWith(spot).getQuote(SPOT_ID, '2026-10-20', '2026-10-23', 9)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a stay that collides with another booking', async () => {
    const taken = [{ start: ba('2026-10-21', 10), end: ba('2026-10-21', 12) }];
    await expect(serviceWith(makeSpot(), taken).getQuote(SPOT_ID, '2026-10-20', '2026-10-23', 9)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('enforces the longest stay and the window the owner set', async () => {
    await expect(serviceWith(makeSpot({ maxStayDays: 3 })).getQuote(SPOT_ID, '2026-10-20', '2026-10-25', 9)).rejects.toThrow('3 días');
    await expect(
      serviceWith(makeSpot({ stayAvailableUntil: '2026-10-22' })).getQuote(SPOT_ID, '2026-10-20', '2026-10-25', 9),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prices by vehicle when the spot does, and needs to know which one', async () => {
    const spot = makeSpot({
      vehicleTypes: [VehicleType.CAR, VehicleType.SUV],
      stayPricesByVehicleType: { [VehicleType.SUV]: { day: 15000, week: 90000, month: 300000 } },
    });
    await expect(serviceWith(spot).getQuote(SPOT_ID, '2026-10-20', '2026-10-21', 9)).rejects.toThrow('vehículo');
    const quote = await serviceWith(spot).getQuote(SPOT_ID, '2026-10-20', '2026-10-21', 9, VehicleType.SUV);
    expect(quote.amount).toBe(15000 * 100);
  });
});

describe('StaysService.getAvailabilityCalendar', () => {
  beforeAll(() => jest.useFakeTimers().setSystemTime(ba('2026-10-15', 12)));
  afterAll(() => jest.useRealTimers());

  it('marks booked and closed days as unavailable', async () => {
    const spot = makeSpot({ blockedDates: [{ from: '2026-10-22', to: '2026-10-22' }] });
    const taken = [{ start: ba('2026-10-20', 10), end: ba('2026-10-20', 12) }];
    const { days } = await serviceWith(spot, taken).getAvailabilityCalendar(SPOT_ID, '2026-10-20', '2026-10-24');
    expect(days.map((d) => [d.date, d.status])).toEqual([
      ['2026-10-20', 'unavailable'],
      ['2026-10-21', 'available'],
      ['2026-10-22', 'unavailable'],
      ['2026-10-23', 'available'],
    ]);
  });
});
