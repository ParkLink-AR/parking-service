// Small builders shared by the specs.

/** An instant in Buenos Aires time (UTC-3, no DST): ba('2026-10-20', 9, 30). */
export function ba(dateISO: string, hour = 0, minute = 0): Date {
  return new Date(`${dateISO}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`);
}

export function window(dateISO: string, startHour: number, endHour: number) {
  return { start: ba(dateISO, startHour), end: ba(dateISO, endHour) };
}

/** [startHour, endHour] pairs of a list of windows on one day, for readable assertions. */
export function hours(windows: { start: Date; end: Date }[]): [number, number][] {
  const hourOf = (date: Date) => (date.getUTCHours() + 21) % 24 + date.getUTCMinutes() / 60;
  return windows.map((w) => [hourOf(w.start), hourOf(w.end) === 0 ? 24 : hourOf(w.end)]);
}
