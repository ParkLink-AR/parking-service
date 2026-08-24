import { TimeWindow } from './interval-math';
export interface ScheduleEntry {
    dayOfWeek: number;
    startHour: number;
    endHour: number;
}
export declare function publishedWindowsForDay(schedule: ScheduleEntry[], dateISO: string): TimeWindow[];
