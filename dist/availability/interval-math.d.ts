export interface TimeWindow {
    start: Date;
    end: Date;
}
export declare enum AvailabilityStatus {
    Closed = "closed",
    Full = "full",
    Available = "available"
}
export declare function filterOverlapping(intervals: TimeWindow[], from: Date, to: Date): TimeWindow[];
export declare function subtractIntervals(baseWindows: TimeWindow[], occupiedIntervals: TimeWindow[]): TimeWindow[];
export declare function subtractIntervalsWithCapacity(baseWindows: TimeWindow[], occupiedIntervals: TimeWindow[], capacity: number): TimeWindow[];
export declare function determineStatus(baseIsEmpty: boolean, freeWindows: TimeWindow[]): AvailabilityStatus;
