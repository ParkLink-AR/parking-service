import { addOneDay, buenosAiresDateTime, buenosAiresMidnight, buenosAiresToday, datesInRange } from '../availability/buenos-aires-time';
import { publishedWindowsForDay, ScheduleEntry } from '../availability/published-schedule';
import { TimeWindow } from '../availability/interval-math';
import { BlockedDateRange, overlapsBlockedDates } from './blocked-dates';
import { comparablePrice, PriceOptions, SortableSpot } from './search-sort';
import { VehicleType } from './vehicle-type';

/**
 * The pure checks behind the search filters (see ParkingSpotsService.search), kept apart
 * from the query so each rule can be tested on its own.
 */

export interface FilterableSpot extends SortableSpot {
  vehicleTypes: VehicleType[];
  schedule: ScheduleEntry[];
  blockedDates: BlockedDateRange[];
  stayAvailableFrom: string | null;
  stayAvailableUntil: string | null;
  maxStayDays: number | null;
}

/**
 * Whether the spot offers half-days at all and hasn't run past the dates it offers stays on
 * -- for a search without a time, like stayOnly's own date check.
 */
export function offersHalfDay(spot: FilterableSpot, today = buenosAiresToday()): boolean {
  return (
    spot.stayEnabled && spot.halfDayEnabled && (spot.stayAvailableUntil === null || spot.stayAvailableUntil >= today)
  );
}

/** Whether the spot takes that kind of vehicle. */
export function fitsVehicle(spot: FilterableSpot, vehicleType: VehicleType | undefined): boolean {
  return vehicleType === undefined || spot.vehicleTypes.includes(vehicleType);
}

/**
 * Whether the spot's price (per hour, or per day for stays, for the driver's vehicle when
 * given -- see comparablePrice) falls within [minPrice, maxPrice]. Both are the owner's own
 * rates: mobile takes the commission out of what the driver typed before asking. A spot
 * without that kind of price only passes when no range was asked for.
 */
export function withinPriceRange(
  spot: FilterableSpot,
  minPrice: number | undefined,
  maxPrice: number | undefined,
  options: PriceOptions,
): boolean {
  if (minPrice === undefined && maxPrice === undefined) return true;
  const price = comparablePrice(spot, options);
  if (price === null) return false;
  return (minPrice === undefined || price >= minPrice) && (maxPrice === undefined || price <= maxPrice);
}

/** At least `minRating` stars on average, from at least one review. */
export function meetsRating(spot: FilterableSpot, minRating: number | undefined): boolean {
  return minRating === undefined || (spot.reviewCount > 0 && spot.rating >= minRating);
}

/** Merges windows that overlap or touch (20-24 and 0-8 the next day become 20-08). */
function mergeWindows(windows: TimeWindow[]): TimeWindow[] {
  const sorted = [...windows].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: TimeWindow[] = [];
  for (const window of sorted) {
    const last = merged.at(-1);
    if (last && window.start.getTime() <= last.end.getTime()) {
      if (window.end.getTime() > last.end.getTime()) last.end = window.end;
    } else {
      merged.push({ start: window.start, end: window.end });
    }
  }
  return merged;
}

/**
 * Whether the spot's weekly hours cover all of [start, end) -- a booking can cross midnight
 * or span days, as long as the spot is open the whole time.
 */
export function scheduleCovers(schedule: ScheduleEntry[], start: Date, end: Date): boolean {
  if (start.getTime() >= end.getTime()) return false;
  // From the day before (a window from yesterday may run past midnight) to the last day.
  const first = buenosAiresToday(new Date(start.getTime() - 24 * 60 * 60 * 1000));
  const last = addOneDay(buenosAiresToday(new Date(end.getTime() - 1)));
  const windows = [...datesInRange(first, last)].flatMap((day) => publishedWindowsForDay(schedule, day));
  return mergeWindows(windows).some(
    (window) => window.start.getTime() <= start.getTime() && end.getTime() <= window.end.getTime(),
  );
}

/** How far past its start a time is still offered today (13:05 still lets you book 13:00), as in the app. */
const PAST_START_TOLERANCE_MS = 10 * 60 * 1000;

/** Whether an hourly booking starting at `start` is already too far gone to be made. */
export function startsInThePast(start: Date, now: Date = new Date()): boolean {
  return start.getTime() < now.getTime() - PAST_START_TOLERANCE_MS;
}

/** Whether an hourly booking for [start, end) would be accepted: hourly on, open, not closed by hand. */
export function openForHourly(spot: FilterableSpot, start: Date, end: Date): boolean {
  return spot.hourlyEnabled && scheduleCovers(spot.schedule, start, end) && !overlapsBlockedDates(spot.blockedDates, start, end);
}

/** Calendar days in [startDate, endDate). */
function daysBetween(startDate: string, endDate: string): number {
  return Math.round((buenosAiresMidnight(endDate).getTime() - buenosAiresMidnight(startDate).getTime()) / 86_400_000);
}

/**
 * Whether the spot takes a stay from startDate to endDate (YYYY-MM-DD, check-out day): the
 * same rules StaysService.getQuote enforces when it's booked -- within the dates the owner
 * offers, no longer than their maximum, and no day closed by hand. Free of other bookings
 * is checked separately, against booking-service.
 */
export function acceptsStay(spot: FilterableSpot, startDate: string, endDate: string, today = buenosAiresToday()): boolean {
  if (!spot.stayEnabled || endDate <= startDate || startDate < today) return false;
  if (startDate < (spot.stayAvailableFrom ?? today)) return false;
  if (spot.stayAvailableUntil !== null && endDate > spot.stayAvailableUntil) return false;
  if (spot.maxStayDays !== null && daysBetween(startDate, endDate) > spot.maxStayDays) return false;
  // Up to the end of the check-out day: whatever the check-in hour, the stay runs into it.
  return !overlapsBlockedDates(spot.blockedDates, buenosAiresMidnight(startDate), buenosAiresMidnight(addOneDay(endDate)));
}

/**
 * The instants a stay search asks booking-service about (from now on, if it starts today).
 * With the check-in hour it's exactly what the stay will occupy -- from that hour on
 * startDate to the same hour on endDate, like StaysService.getQuote. Without it, the whole
 * days from startDate to endDate: a guide, the exact hour is checked again when it's quoted.
 */
export function stayWindow(startDate: string, endDate: string, now = new Date(), startHour?: number): TimeWindow {
  const start = startHour === undefined ? buenosAiresMidnight(startDate) : buenosAiresDateTime(startDate, startHour);
  const end = startHour === undefined ? buenosAiresMidnight(endDate) : buenosAiresDateTime(endDate, startHour);
  return { start: start.getTime() > now.getTime() ? start : now, end };
}
