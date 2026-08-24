// Buenos Aires has no DST, so a fixed -03:00 offset is safe and simple -- same assumption
// booking-service's Go mock makes. No timezone library exists in this repo yet; this file
// is the whole of what's needed for a single fixed-offset city.

export const BUENOS_AIRES_OFFSET_HOURS = -3;

/** The UTC instant corresponding to Buenos Aires local midnight on dateISO (YYYY-MM-DD). */
export function buenosAiresMidnight(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, -BUENOS_AIRES_OFFSET_HOURS));
}

/** Formats a UTC instant as RFC3339 with the Buenos Aires offset, e.g. "2026-08-18T08:00:00-03:00". */
export function formatBuenosAires(date: Date): string {
  const shifted = new Date(date.getTime() + BUENOS_AIRES_OFFSET_HOURS * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 19) + '-03:00';
}

/** Advances a YYYY-MM-DD calendar date by one day. */
export function addOneDay(dateISO: string): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/** Yields each calendar date (YYYY-MM-DD) in the half-open range [from, to). */
export function* datesInRange(from: string, to: string): Generator<string> {
  let current = from;
  while (current < to) {
    yield current;
    current = addOneDay(current);
  }
}
