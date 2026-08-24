"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityStatus = void 0;
exports.filterOverlapping = filterOverlapping;
exports.subtractIntervals = subtractIntervals;
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