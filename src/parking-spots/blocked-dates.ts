import { addOneDay, buenosAiresMidnight, buenosAiresToday } from '../availability/buenos-aires-time';

/**
 * Días completos que el dueño cerró a mano (vacaciones, ese día la usa él): `from` y `to`
 * inclusive, YYYY-MM-DD en hora de Buenos Aires. Un día bloqueado no se puede reservar ni
 * por hora ni dentro de una estadía, aunque el horario semanal diga que abre.
 */
export interface BlockedDateRange {
  from: string;
  to: string;
}

/** The instants a blocked range covers: from 00:00 of `from` to 00:00 of the day after `to`. */
export function blockedWindow(range: BlockedDateRange): { start: Date; end: Date } {
  return { start: buenosAiresMidnight(range.from), end: buenosAiresMidnight(addOneDay(range.to)) };
}

export function isDateBlocked(ranges: BlockedDateRange[] | null | undefined, dateISO: string): boolean {
  return (ranges ?? []).some((range) => range.from <= dateISO && dateISO <= range.to);
}

/** Whether [start, end) touches any blocked day. */
export function overlapsBlockedDates(ranges: BlockedDateRange[] | null | undefined, start: Date, end: Date): boolean {
  return (ranges ?? []).some((range) => {
    const window = blockedWindow(range);
    return start.getTime() < window.end.getTime() && window.start.getTime() < end.getTime();
  });
}

/** Only the ranges that haven't ended yet, sorted -- what's worth keeping and showing. */
export function upcomingBlockedDates(ranges: BlockedDateRange[] | null | undefined): BlockedDateRange[] {
  const today = buenosAiresToday();
  return (ranges ?? [])
    .filter((range) => range.to >= today)
    .sort((a, b) => a.from.localeCompare(b.from));
}
