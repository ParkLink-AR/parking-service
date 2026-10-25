import {
  acceptsStay, FilterableSpot, fitsVehicle, meetsRating, offersHalfDay, openForHourly, scheduleCovers, stayWindow, withinPriceRange,
} from '../../src/parking-spots/search-filters';
import { comparablePrice } from '../../src/parking-spots/search-sort';
import { VehicleType } from '../../src/parking-spots/vehicle-type';
import { ba } from '../helpers';

// 2026-11-02 is a Monday (dayOfWeek 0).
const MONDAY = '2026-11-02';
const TUESDAY = '2026-11-03';

function spot(overrides: Partial<FilterableSpot> = {}): FilterableSpot {
  return {
    hourlyEnabled: true,
    pricePerHour: 1000,
    pricePerHourByVehicleType: null,
    stayEnabled: true,
    pricePerDay: 8000,
    stayPricesByVehicleType: null,
    halfDayEnabled: false,
    pricePerHalfDay: null,
    rating: 0,
    reviewCount: 0,
    vehicleTypes: [VehicleType.CAR, VehicleType.MOTORCYCLE],
    schedule: [{ dayOfWeek: 0, startHour: 8, endHour: 20 }],
    blockedDates: [],
    stayAvailableFrom: null,
    stayAvailableUntil: null,
    maxStayDays: 30,
    ...overrides,
  };
}

describe('fitsVehicle', () => {
  it('keeps the spots that take that vehicle, or all of them without one', () => {
    expect(fitsVehicle(spot(), VehicleType.MOTORCYCLE)).toBe(true);
    expect(fitsVehicle(spot(), VehicleType.VAN)).toBe(false);
    expect(fitsVehicle(spot(), undefined)).toBe(true);
  });
});

describe('comparablePrice with a vehicle', () => {
  it("is that vehicle's own rate when the spot charges by vehicle", () => {
    const byVehicle = spot({ pricePerHour: null, pricePerHourByVehicleType: { car: 900, suv: 1500 } });
    expect(comparablePrice(byVehicle, { vehicleType: 'suv' })).toBe(1500);
    expect(comparablePrice(byVehicle, {})).toBe(900);
  });

  it('is the one rate when the spot charges the same to everyone', () => {
    expect(comparablePrice(spot(), { vehicleType: 'suv' })).toBe(1000);
  });

  it('per day for stays', () => {
    const byVehicle = spot({ stayPricesByVehicleType: { car: { day: 7000 }, suv: { day: 9000 } } });
    expect(comparablePrice(byVehicle, { stays: true, vehicleType: 'suv' })).toBe(9000);
  });
});

describe('withinPriceRange', () => {
  it('compares against the hourly price, or the daily one for stays', () => {
    expect(withinPriceRange(spot(), 500, 1200, {})).toBe(true);
    expect(withinPriceRange(spot(), 1100, undefined, {})).toBe(false);
    expect(withinPriceRange(spot(), undefined, 900, {})).toBe(false);
    expect(withinPriceRange(spot(), 7000, 9000, { stays: true })).toBe(true);
  });

  it("leaves out a spot without that kind of price only when there's a range", () => {
    const stayOnly = spot({ hourlyEnabled: false, pricePerHour: null });
    expect(withinPriceRange(stayOnly, undefined, 2000, {})).toBe(false);
    expect(withinPriceRange(stayOnly, undefined, undefined, {})).toBe(true);
  });
});

describe('meetsRating', () => {
  it('needs the average and at least one review', () => {
    expect(meetsRating(spot({ rating: 4.5, reviewCount: 3 }), 4)).toBe(true);
    expect(meetsRating(spot({ rating: 3.9, reviewCount: 3 }), 4)).toBe(false);
    expect(meetsRating(spot(), 4)).toBe(false);
    expect(meetsRating(spot(), undefined)).toBe(true);
  });
});

describe('scheduleCovers', () => {
  const schedule = [{ dayOfWeek: 0, startHour: 8, endHour: 20 }];

  it('is true only when the whole range is inside the open hours', () => {
    expect(scheduleCovers(schedule, ba(MONDAY, 9), ba(MONDAY, 11))).toBe(true);
    expect(scheduleCovers(schedule, ba(MONDAY, 7), ba(MONDAY, 9))).toBe(false);
    expect(scheduleCovers(schedule, ba(MONDAY, 19), ba(MONDAY, 21))).toBe(false);
    expect(scheduleCovers(schedule, ba(TUESDAY, 9), ba(TUESDAY, 11))).toBe(false);
  });

  it('follows the open hours past midnight', () => {
    const overnight = [
      { dayOfWeek: 0, startHour: 20, endHour: 24 },
      { dayOfWeek: 1, startHour: 0, endHour: 8 },
    ];
    expect(scheduleCovers(overnight, ba(MONDAY, 22), ba(TUESDAY, 6))).toBe(true);
    expect(scheduleCovers(overnight, ba(MONDAY, 22), ba(TUESDAY, 9))).toBe(false);
  });

  it('a spot open around the clock takes a booking of several days', () => {
    const always = Array.from({ length: 7 }, (_, day) => ({ dayOfWeek: day, startHour: 0, endHour: 24 }));
    expect(scheduleCovers(always, ba(MONDAY, 10), ba('2026-11-05', 10))).toBe(true);
  });
});

describe('openForHourly', () => {
  it('needs hourly bookings on, the open hours and no day closed by hand', () => {
    expect(openForHourly(spot(), ba(MONDAY, 9), ba(MONDAY, 10))).toBe(true);
    expect(openForHourly(spot({ hourlyEnabled: false }), ba(MONDAY, 9), ba(MONDAY, 10))).toBe(false);
    expect(openForHourly(spot({ blockedDates: [{ from: MONDAY, to: MONDAY }] }), ba(MONDAY, 9), ba(MONDAY, 10))).toBe(false);
  });
});

describe('acceptsStay', () => {
  const today = '2026-10-21';

  it('takes a stay within what the owner offers', () => {
    expect(acceptsStay(spot(), '2026-11-02', '2026-11-09', today)).toBe(true);
  });

  it('refuses stays off, past dates, or a check-out before the check-in', () => {
    expect(acceptsStay(spot({ stayEnabled: false }), '2026-11-02', '2026-11-09', today)).toBe(false);
    expect(acceptsStay(spot(), '2026-10-20', '2026-10-25', today)).toBe(false);
    expect(acceptsStay(spot(), '2026-11-09', '2026-11-02', today)).toBe(false);
  });

  it("refuses what's outside the offered dates or longer than the maximum", () => {
    expect(acceptsStay(spot({ stayAvailableFrom: '2026-11-05' }), '2026-11-02', '2026-11-09', today)).toBe(false);
    expect(acceptsStay(spot({ stayAvailableUntil: '2026-11-08' }), '2026-11-02', '2026-11-09', today)).toBe(false);
    expect(acceptsStay(spot({ maxStayDays: 5 }), '2026-11-02', '2026-11-09', today)).toBe(false);
  });

  it('refuses a stay that touches a day closed by hand, check-out day included', () => {
    expect(acceptsStay(spot({ blockedDates: [{ from: '2026-11-04', to: '2026-11-04' }] }), '2026-11-02', '2026-11-09', today)).toBe(false);
    expect(acceptsStay(spot({ blockedDates: [{ from: '2026-11-09', to: '2026-11-09' }] }), '2026-11-02', '2026-11-09', today)).toBe(false);
    expect(acceptsStay(spot({ blockedDates: [{ from: '2026-11-10', to: '2026-11-12' }] }), '2026-11-02', '2026-11-09', today)).toBe(true);
  });
});

describe('stayWindow', () => {
  it('runs over the whole days, from now on when it starts today', () => {
    const now = ba('2026-10-21', 15);
    expect(stayWindow('2026-11-02', '2026-11-04', now)).toEqual({ start: ba('2026-11-02'), end: ba('2026-11-04') });
    expect(stayWindow('2026-10-21', '2026-10-23', now).start).toEqual(now);
  });
});

describe('half-days in the search', () => {
  const halfDay = (overrides: Partial<FilterableSpot> = {}) => spot({ halfDayEnabled: true, pricePerHalfDay: 6000, ...overrides });

  it('compares the 12-hour price, the vehicle\'s own when it has one', () => {
    expect(comparablePrice(halfDay(), { halfDay: true })).toBe(6000);
    expect(comparablePrice(spot(), { halfDay: true })).toBeNull();
    const byVehicle = halfDay({
      pricePerHalfDay: 5000,
      stayPricesByVehicleType: { car: { day: 9000, halfDay: 5000 }, suv: { day: 12000, halfDay: 7000 } },
    });
    expect(comparablePrice(byVehicle, { halfDay: true, vehicleType: 'suv' })).toBe(7000);
    expect(comparablePrice(byVehicle, { halfDay: true })).toBe(5000);
  });

  it('filters the price range by it', () => {
    expect(withinPriceRange(halfDay(), 5000, 7000, { halfDay: true })).toBe(true);
    expect(withinPriceRange(halfDay(), undefined, 5000, { halfDay: true })).toBe(false);
  });

  it("offers it only while the stay's dates haven't run out", () => {
    expect(offersHalfDay(halfDay(), '2026-10-21')).toBe(true);
    expect(offersHalfDay(spot(), '2026-10-21')).toBe(false);
    expect(offersHalfDay(halfDay({ stayEnabled: false }), '2026-10-21')).toBe(false);
    expect(offersHalfDay(halfDay({ stayAvailableUntil: '2026-10-20' }), '2026-10-21')).toBe(false);
  });
});
