"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishedWindowsForDay = publishedWindowsForDay;
const buenos_aires_time_1 = require("./buenos-aires-time");
const OPEN_HOUR = 8;
const CLOSE_HOUR = 20;
function publishedWindowsForDay(dateISO) {
    const midnight = (0, buenos_aires_time_1.buenosAiresMidnight)(dateISO);
    const weekday = midnight.getUTCDay();
    if (weekday === 0 || weekday === 6)
        return [];
    return [
        {
            start: addHours(midnight, OPEN_HOUR),
            end: addHours(midnight, CLOSE_HOUR),
        },
    ];
}
function addHours(date, hours) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
}
//# sourceMappingURL=schedule-mock.js.map