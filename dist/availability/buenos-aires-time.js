"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUENOS_AIRES_OFFSET_HOURS = void 0;
exports.buenosAiresMidnight = buenosAiresMidnight;
exports.formatBuenosAires = formatBuenosAires;
exports.addOneDay = addOneDay;
exports.addDays = addDays;
exports.datesInRange = datesInRange;
exports.BUENOS_AIRES_OFFSET_HOURS = -3;
function buenosAiresMidnight(dateISO) {
    const [year, month, day] = dateISO.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, -exports.BUENOS_AIRES_OFFSET_HOURS));
}
function formatBuenosAires(date) {
    const shifted = new Date(date.getTime() + exports.BUENOS_AIRES_OFFSET_HOURS * 60 * 60 * 1000);
    return shifted.toISOString().slice(0, 19) + '-03:00';
}
function addOneDay(dateISO) {
    return addDays(dateISO, 1);
}
function addDays(dateISO, days) {
    const [year, month, day] = dateISO.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
function* datesInRange(from, to) {
    let current = from;
    while (current < to) {
        yield current;
        current = addOneDay(current);
    }
}
//# sourceMappingURL=buenos-aires-time.js.map