// Pure interval arithmetic, ported from booking-service's Go implementation
// (internal/service/availability/availability_calculator.go). JS Date objects are always
// absolute instants (no separate "location" tag like Go's time.Time), so comparisons via
// getTime() are inherently instant-based -- there is no UTC-conversion step to port.

export interface TimeWindow {
  start: Date;
  end: Date;
}

export enum AvailabilityStatus {
  Closed = 'closed',
  Full = 'full',
  Available = 'available',
}

/** Returns the intervals that overlap the half-open range [from, to). */
export function filterOverlapping(intervals: TimeWindow[], from: Date, to: Date): TimeWindow[] {
  return intervals.filter((interval) => interval.start.getTime() < to.getTime() && interval.end.getTime() > from.getTime());
}

/**
 * Subtracts occupiedIntervals from baseWindows, returning the free sub-windows sorted by
 * start. Overlapping occupied intervals are merged before subtraction; zero-or-negative
 * length results are discarded.
 */
export function subtractIntervals(baseWindows: TimeWindow[], occupiedIntervals: TimeWindow[]): TimeWindow[] {
  const merged = mergeIntervals(occupiedIntervals);
  const free: TimeWindow[] = [];

  for (const base of baseWindows) {
    let pieces: TimeWindow[] = [base];
    for (const occupied of merged) {
      const next: TimeWindow[] = [];
      for (const piece of pieces) {
        next.push(...subtractOne(piece, occupied));
      }
      pieces = next;
    }
    for (const piece of pieces) {
      if (piece.end.getTime() > piece.start.getTime()) {
        free.push(piece);
      }
    }
  }

  free.sort((a, b) => a.start.getTime() - b.start.getTime());
  return free;
}

/**
 * Like subtractIntervals, but the spot has `capacity` identical places (a "playa"):
 * a sub-window stays free while *fewer than* `capacity` occupied intervals overlap it.
 * capacity <= 1 is exactly subtractIntervals. Adjacent free slices are merged back.
 */
export function subtractIntervalsWithCapacity(
  baseWindows: TimeWindow[],
  occupiedIntervals: TimeWindow[],
  capacity: number,
): TimeWindow[] {
  if (capacity <= 1) return subtractIntervals(baseWindows, occupiedIntervals);

  const free: TimeWindow[] = [];

  for (const base of baseWindows) {
    const baseStart = base.start.getTime();
    const baseEnd = base.end.getTime();

    // Clip every occupied interval to this base window; keep only real ones.
    const clipped = occupiedIntervals
      .map((o) => ({ start: Math.max(o.start.getTime(), baseStart), end: Math.min(o.end.getTime(), baseEnd) }))
      .filter((o) => o.start < o.end);

    // Event points partition the base window into slices with a constant overlap count.
    const points = Array.from(new Set([baseStart, baseEnd, ...clipped.flatMap((o) => [o.start, o.end])])).sort(
      (a, b) => a - b,
    );

    for (let i = 0; i < points.length - 1; i++) {
      const sliceStart = points[i];
      const sliceEnd = points[i + 1];
      if (sliceStart >= sliceEnd) continue;
      const mid = (sliceStart + sliceEnd) / 2;
      const concurrent = clipped.filter((o) => o.start <= mid && mid < o.end).length;
      if (concurrent < capacity) {
        free.push({ start: new Date(sliceStart), end: new Date(sliceEnd) });
      }
    }
  }

  free.sort((a, b) => a.start.getTime() - b.start.getTime());
  return mergeIntervals(free);
}

/** Classifies a day as closed (no published base), full (base fully occupied), or available. */
export function determineStatus(baseIsEmpty: boolean, freeWindows: TimeWindow[]): AvailabilityStatus {
  if (baseIsEmpty) return AvailabilityStatus.Closed;
  if (freeWindows.length === 0) return AvailabilityStatus.Full;
  return AvailabilityStatus.Available;
}

/** Returns window minus occupied, split into 0, 1, or 2 sub-windows. */
function subtractOne(window: TimeWindow, occupied: TimeWindow): TimeWindow[] {
  if (occupied.start.getTime() >= window.end.getTime() || occupied.end.getTime() <= window.start.getTime()) {
    return [window];
  }
  const result: TimeWindow[] = [];
  if (occupied.start.getTime() > window.start.getTime()) {
    result.push({ start: window.start, end: occupied.start });
  }
  if (occupied.end.getTime() < window.end.getTime()) {
    result.push({ start: occupied.end, end: window.end });
  }
  return result;
}

/** Sorts by start and merges overlapping or touching intervals. */
function mergeIntervals(intervals: TimeWindow[]): TimeWindow[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: TimeWindow[] = [sorted[0]];
  for (const current of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (current.start.getTime() <= last.end.getTime()) {
      if (current.end.getTime() > last.end.getTime()) {
        last.end = current.end;
      }
    } else {
      merged.push(current);
    }
  }
  return merged;
}
