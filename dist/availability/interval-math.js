"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityStatus = void 0;
exports.filterOverlapping = filterOverlapping;
exports.subtractIntervals = subtractIntervals;
exports.subtractIntervalsWithCapacity = subtractIntervalsWithCapacity;
exports.determineStatus = determineStatus;
var AvailabilityStatus;
(function (AvailabilityStatus) {
    AvailabilityStatus["Closed"] = "closed";
    AvailabilityStatus["Full"] = "full";
    AvailabilityStatus["Available"] = "available";
})(AvailabilityStatus || (exports.AvailabilityStatus = AvailabilityStatus = {}));
function filterOverlapping(intervals, from, to) {
    return intervals.filter((interval) => interval.start.getTime() < to.getTime() && interval.end.getTime() > from.getTime());
}
function subtractIntervals(baseWindows, occupiedIntervals) {
    const merged = mergeIntervals(occupiedIntervals);
    const free = [];
    for (const base of baseWindows) {
        let pieces = [base];
        for (const occupied of merged) {
            const next = [];
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
function subtractIntervalsWithCapacity(baseWindows, occupiedIntervals, capacity) {
    if (capacity <= 1)
        return subtractIntervals(baseWindows, occupiedIntervals);
    const free = [];
    for (const base of baseWindows) {
        const baseStart = base.start.getTime();
        const baseEnd = base.end.getTime();
        const clipped = occupiedIntervals
            .map((o) => ({ start: Math.max(o.start.getTime(), baseStart), end: Math.min(o.end.getTime(), baseEnd) }))
            .filter((o) => o.start < o.end);
        const points = Array.from(new Set([baseStart, baseEnd, ...clipped.flatMap((o) => [o.start, o.end])])).sort((a, b) => a - b);
        for (let i = 0; i < points.length - 1; i++) {
            const sliceStart = points[i];
            const sliceEnd = points[i + 1];
            if (sliceStart >= sliceEnd)
                continue;
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
function determineStatus(baseIsEmpty, freeWindows) {
    if (baseIsEmpty)
        return AvailabilityStatus.Closed;
    if (freeWindows.length === 0)
        return AvailabilityStatus.Full;
    return AvailabilityStatus.Available;
}
function subtractOne(window, occupied) {
    if (occupied.start.getTime() >= window.end.getTime() || occupied.end.getTime() <= window.start.getTime()) {
        return [window];
    }
    const result = [];
    if (occupied.start.getTime() > window.start.getTime()) {
        result.push({ start: window.start, end: occupied.start });
    }
    if (occupied.end.getTime() < window.end.getTime()) {
        result.push({ start: occupied.end, end: window.end });
    }
    return result;
}
function mergeIntervals(intervals) {
    if (intervals.length === 0)
        return [];
    const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged = [sorted[0]];
    for (const current of sorted.slice(1)) {
        const last = merged[merged.length - 1];
        if (current.start.getTime() <= last.end.getTime()) {
            if (current.end.getTime() > last.end.getTime()) {
                last.end = current.end;
            }
        }
        else {
            merged.push(current);
        }
    }
    return merged;
}
//# sourceMappingURL=interval-math.js.map