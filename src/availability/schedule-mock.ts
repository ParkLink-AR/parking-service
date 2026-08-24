import { TimeWindow } from './interval-math';
import { buenosAiresMidnight } from './buenos-aires-time';

// Stands in for a real published schedule until ParkingSpot models structured hours
// (today it only has scheduleText, free-form text). Mirrors booking-service's Go mock:
// Monday-to-Friday 08:00-20:00 Buenos Aires local time, closed weekends, identical for
// every spot regardless of id.
const OPEN_HOUR = 8;
const CLOSE_HOUR = 20;

export function publishedWindowsForDay(dateISO: string): TimeWindow[] {
  const midnight = buenosAiresMidnight(dateISO);
  const weekday = midnight.getUTCDay(); // stable: buenosAiresMidnight always lands at 03:00 UTC

  if (weekday === 0 || weekday === 6) return [];

  return [
    {
      start: addHours(midnight, OPEN_HOUR),
      end: addHours(midnight, CLOSE_HOUR),
    },
  ];
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
