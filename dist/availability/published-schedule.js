"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishedWindowsForDay = publishedWindowsForDay;
const buenos_aires_time_1 = require("./buenos-aires-time");
function toDayOfWeek(jsWeekday) {
    return (jsWeekday + 6) % 7;
}
function addHours(date, hours) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
function publishedWindowsForDay(schedule, dateISO) {
    const midnight = (0, buenos_aires_time_1.buenosAiresMidnight)(dateISO);
    const dayOfWeek = toDayOfWeek(midnight.getUTCDay());
    return schedule
        .filter((entry) => entry.dayOfWeek === dayOfWeek)
        .map((entry) => ({
        start: addHours(midnight, entry.startHour),
        end: addHours(midnight, entry.endHour),
    }));
}
//# sourceMappingURL=published-schedule.js.map