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
