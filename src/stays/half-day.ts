import { buenosAiresDateTime, buenosAiresToday, isPastCheckIn } from '../availability/buenos-aires-time';
import { TimeWindow } from '../availability/interval-math';
import { BlockedDateRange, overlapsBlockedDates } from '../parking-spots/blocked-dates';

/**
 * "Media estadía": a 12-hour block from whatever hour the driver picks, at a closed price.
 * It's part of the stay -- the dates the owner offers stays on and the days they closed apply
 * the same way -- not of hourly bookings, so the weekly hours don't. These rules are shared
 * by the quote (StaysService.getHalfDayQuote), the hours offered for a day
 * (StaysService.getHalfDayStarts) and the search (search-filters), so the three always agree.
 */

export const HALF_DAY_HOURS = 12;
const HOUR_MS = 60 * 60 * 1000;

export interface HalfDaySpot {
  stayEnabled: boolean;
  halfDayEnabled: boolean;
  stayAvailableFrom: string | null;
  stayAvailableUntil: string | null;
  blockedDates: BlockedDateRange[] | null;
}

/** The block that starts at `hour`:00 (Buenos Aires) on dateISO. */
export function halfDayWindow(dateISO: string, hour: number): TimeWindow {
  const start = buenosAiresDateTime(dateISO, hour);
  return { start, end: new Date(start.getTime() + HALF_DAY_HOURS * HOUR_MS) };
}

/**
 * Why the spot can't take a half-day starting at `start`, in Spanish for the driver -- or
 * null when it can (free of other bookings aside, which needs booking-service). A block can
 * start in the hour that's already under way (it's booked from that moment on), never
 * earlier; and it has to fit, check-out included, within the dates the owner offers stays.
 */
export function halfDayRefusal(spot: HalfDaySpot, start: Date, now = new Date()): string | null {
  if (!spot.stayEnabled || !spot.halfDayEnabled) return 'Esta cochera no ofrece media estadía.';
  const end = new Date(start.getTime() + HALF_DAY_HOURS * HOUR_MS);
  if (isPastCheckIn(start, now)) return 'Ese horario ya pasó.';
  const startDate = buenosAiresToday(start);
  const endDate = buenosAiresToday(new Date(end.getTime() - 1));
  const availableFrom = spot.stayAvailableFrom ?? buenosAiresToday(now);
  if (startDate < availableFrom) return `Esta cochera acepta estadías a partir del ${availableFrom}.`;
  if (spot.stayAvailableUntil !== null && endDate > spot.stayAvailableUntil) {
    return `Esta cochera acepta estadías hasta el ${spot.stayAvailableUntil}.`;
  }
  if (overlapsBlockedDates(spot.blockedDates, start, end)) return 'El propietario cerró la cochera en ese horario.';
  return null;
}
