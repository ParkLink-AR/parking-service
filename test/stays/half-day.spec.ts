import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { HALF_DAY_HOURS, halfDayRefusal, halfDayWindow } from '../../src/stays/half-day';
import { StaysService } from '../../src/stays/stays.service';
import { VehicleType } from '../../src/parking-spots/vehicle-type';
import { bookingClientWith, makeSpot, repoReturning, SPOT_ID } from '../fakes';
import { ba } from '../helpers';

// A spot that offers half-days at $6.000 the 12 hours.
const halfDaySpot = (overrides: Parameters<typeof makeSpot>[0] = {}) =>
  makeSpot({ halfDayEnabled: true, pricePerHalfDay: 6000, ...overrides });

function serviceWith(spot = halfDaySpot(), bookings: { start: Date; end: Date }[] = []) {
  const bookingClient = bookingClientWith(bookings);
  return { service: new StaysService(repoReturning(spot) as never, bookingClient as never), bookingClient };
}

describe('halfDayWindow', () => {
  it('is 12 hours from the chosen hour, crossing midnight when it has to', () => {
    expect(HALF_DAY_HOURS).toBe(12);
    expect(halfDayWindow('2026-10-20', 8)).toEqual({ start: ba('2026-10-20', 8), end: ba('2026-10-20', 20) });
    expect(halfDayWindow('2026-10-20', 20)).toEqual({ start: ba('2026-10-20', 20), end: ba('2026-10-21', 8) });
  });
});

describe('halfDayRefusal', () => {
  const now = ba('2026-10-15', 12, 30);

  it('accepts a block the spot offers, from the hour under way on', () => {
    expect(halfDayRefusal(halfDaySpot(), ba('2026-10-20', 8), now)).toBeNull();
    // 12:00 while it's 12:30: booked from this moment on.
    expect(halfDayRefusal(halfDaySpot(), ba('2026-10-15', 12), now)).toBeNull();
  });

  it('refuses a spot without half-days, or without the stay they belong to', () => {
    expect(halfDayRefusal(makeSpot(), ba('2026-10-20', 8), now)).toMatch('no ofrece media estadía');
    expect(halfDayRefusal(halfDaySpot({ stayEnabled: false }), ba('2026-10-20', 8), now)).toMatch('no ofrece media estadía');
  });

  it('refuses an hour that already passed', () => {
    expect(halfDayRefusal(halfDaySpot(), ba('2026-10-15', 11), now)).toBe('Ese horario ya pasó.');
  });

  it('keeps the whole block, check-out included, within the dates offered for stays', () => {
    const fromTheNinth = halfDaySpot({ stayAvailableFrom: '2026-10-20' });
    expect(halfDayRefusal(fromTheNinth, ba('2026-10-19', 8), now)).toMatch('a partir del 2026-10-20');
    expect(halfDayRefusal(fromTheNinth, ba('2026-10-20', 8), now)).toBeNull();

    const untilThe20th = halfDaySpot({ stayAvailableUntil: '2026-10-20' });
    expect(halfDayRefusal(untilThe20th, ba('2026-10-20', 8), now)).toBeNull();
    // Starts on the 20th, ends on the 21st: past the last day offered.
    expect(halfDayRefusal(untilThe20th, ba('2026-10-20', 20), now)).toMatch('hasta el 2026-10-20');
  });

  it('refuses a block that touches a day the owner closed, the next one too', () => {
    const closedThe21st = halfDaySpot({ blockedDates: [{ from: '2026-10-21', to: '2026-10-21' }] });
    expect(halfDayRefusal(closedThe21st, ba('2026-10-20', 8), now)).toBeNull();
    expect(halfDayRefusal(closedThe21st, ba('2026-10-20', 20), now)).toMatch('cerró');
  });
});

describe('StaysService.getHalfDayQuote', () => {
  beforeAll(() => jest.useFakeTimers().setSystemTime(ba('2026-10-15', 12)));
  afterAll(() => jest.useRealTimers());

  it('prices the 12 hours at the closed price, in centavos, with the exact instants', async () => {
    const { service } = serviceWith();
    const quote = await service.getHalfDayQuote(SPOT_ID, '2026-10-20', 20);
    expect(quote).toEqual({
      startDateTime: '2026-10-20T20:00:00-03:00',
      endDateTime: '2026-10-21T08:00:00-03:00',
      hours: 12,
      amount: 6000 * 100,
    });
  });

  it("asks booking-service for both days a night block covers", async () => {
    const { service, bookingClient } = serviceWith();
    await service.getHalfDayQuote(SPOT_ID, '2026-10-20', 20);
    expect(bookingClient.getActiveBookings).toHaveBeenCalledWith(SPOT_ID, '2026-10-20', '2026-10-22');
  });

  it('refuses a block that collides with another booking, even by a minute', async () => {
    const taken = [{ start: ba('2026-10-20', 19, 59), end: ba('2026-10-20', 21) }];
    await expect(serviceWith(halfDaySpot(), taken).service.getHalfDayQuote(SPOT_ID, '2026-10-20', 8)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  // booking-service sends each booking already padded with the 15 minutes kept free between
  // two of them (entity.OccupancyWindow), so the margin needs nothing more here.
  it('respects the 15 minutes between bookings, which come padded with them', async () => {
    // A booking 06:00-07:50 arrives as 05:45-08:05: it reaches into an 08:00 block.
    const endsTenMinutesBefore = [{ start: ba('2026-10-20', 5, 45), end: ba('2026-10-20', 8, 5) }];
    await expect(
      serviceWith(halfDaySpot(), endsTenMinutesBefore).service.getHalfDayQuote(SPOT_ID, '2026-10-20', 8),
    ).rejects.toBeInstanceOf(ConflictException);
    // A booking 06:00-07:45 arrives as 05:45-08:00: the block can start right then.
    const endsInTime = [{ start: ba('2026-10-20', 5, 45), end: ba('2026-10-20', 8) }];
    const quote = await serviceWith(halfDaySpot(), endsInTime).service.getHalfDayQuote(SPOT_ID, '2026-10-20', 8);
    expect(quote.amount).toBe(600000);
  });

  it('a spot with two places still takes the block next to one booking', async () => {
    const taken = [{ start: ba('2026-10-20', 10), end: ba('2026-10-20', 12) }];
    const quote = await serviceWith(halfDaySpot({ capacity: 2 }), taken).service.getHalfDayQuote(SPOT_ID, '2026-10-20', 8);
    expect(quote.amount).toBe(600000);
  });

  it("refuses a spot that doesn't offer it, an hour gone, and a spot that doesn't exist", async () => {
    await expect(serviceWith(makeSpot()).service.getHalfDayQuote(SPOT_ID, '2026-10-20', 8)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(serviceWith().service.getHalfDayQuote(SPOT_ID, '2026-10-15', 9)).rejects.toThrow('ya pasó');
    const missing = new StaysService(repoReturning(null) as never, bookingClientWith() as never);
    await expect(missing.getHalfDayQuote(SPOT_ID, '2026-10-20', 8)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("prices by vehicle when the spot does, and needs to know which one", async () => {
    const spot = halfDaySpot({
      vehicleTypes: [VehicleType.CAR, VehicleType.SUV],
      pricePerHalfDay: 5000,
      stayPricesByVehicleType: {
        [VehicleType.CAR]: { day: 10000, week: 60000, month: 200000, halfDay: 5000 },
        [VehicleType.SUV]: { day: 15000, week: 90000, month: 300000, halfDay: 8000 },
      },
    });
    await expect(serviceWith(spot).service.getHalfDayQuote(SPOT_ID, '2026-10-20', 8)).rejects.toThrow('vehículo');
    const quote = await serviceWith(spot).service.getHalfDayQuote(SPOT_ID, '2026-10-20', 8, VehicleType.SUV);
    expect(quote.amount).toBe(8000 * 100);
  });
});

describe('StaysService.getHalfDayStarts', () => {
  beforeAll(() => jest.useFakeTimers().setSystemTime(ba('2026-10-15', 12, 30)));
  afterAll(() => jest.useRealTimers());

  const available = (starts: { hour: number; available: boolean }[]) =>
    starts.filter((start) => start.available).map((start) => start.hour);

  it('offers every hour of a free day', async () => {
    const { starts } = await serviceWith().service.getHalfDayStarts(SPOT_ID, '2026-10-20');
    expect(starts).toHaveLength(24);
    expect(available(starts)).toEqual(Array.from({ length: 24 }, (_, hour) => hour));
  });

  it("leaves out the hours whose 12 hours would run into a booking, that night's included", async () => {
    // Taken 20:00 to 22:00 on the 20th: a block can't start from 09:00 (ends 21:00) to 21:00.
    const taken = [{ start: ba('2026-10-20', 20), end: ba('2026-10-20', 22) }];
    const { starts } = await serviceWith(halfDaySpot(), taken).service.getHalfDayStarts(SPOT_ID, '2026-10-20');
    expect(available(starts)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 22, 23]);
  });

  it("leaves out today's hours that already passed", async () => {
    const { starts } = await serviceWith().service.getHalfDayStarts(SPOT_ID, '2026-10-15');
    expect(available(starts)).toEqual(Array.from({ length: 12 }, (_, i) => i + 12));
  });

  it("refuses a spot that doesn't offer half-days", async () => {
    await expect(serviceWith(makeSpot()).service.getHalfDayStarts(SPOT_ID, '2026-10-20')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
