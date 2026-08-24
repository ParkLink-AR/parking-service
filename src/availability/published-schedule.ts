import { TimeWindow } from './interval-math';
import { buenosAiresMidnight } from './buenos-aires-time';

export interface ScheduleEntry {
  dayOfWeek: number; // 0=Lunes … 6=Domingo, ver ParkingSpotSchedule
  startHour: number;
  endHour: number;
}

/** JS getUTCDay() es 0=Domingo … 6=Sábado; ScheduleEntry.dayOfWeek es 0=Lunes … 6=Domingo. */
function toDayOfWeek(jsWeekday: number): number {
  return (jsWeekday + 6) % 7;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Ventanas publicadas de una cochera para un día calendario, a partir de su
 * horario semanal real (reemplaza el mock fijo Lun-Vie 08-20 que existía
 * hasta que ParkingSpot pasó a modelar horarios estructurados). Puede haber
 * más de una ventana por día (turno partido) -- subtractIntervals ya itera
 * sobre un array, así que no hace falta tratarlo distinto acá.
 */
export function publishedWindowsForDay(schedule: ScheduleEntry[], dateISO: string): TimeWindow[] {
  const midnight = buenosAiresMidnight(dateISO);
  const dayOfWeek = toDayOfWeek(midnight.getUTCDay()); // estable: buenosAiresMidnight siempre cae a las 03:00 UTC

  return schedule
    .filter((entry) => entry.dayOfWeek === dayOfWeek)
    .map((entry) => ({
      start: addHours(midnight, entry.startHour),
      end: addHours(midnight, entry.endHour),
    }));
}
