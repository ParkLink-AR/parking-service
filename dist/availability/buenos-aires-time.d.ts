export declare const BUENOS_AIRES_OFFSET_HOURS = -3;
export declare function buenosAiresMidnight(dateISO: string): Date;
export declare function formatBuenosAires(date: Date): string;
export declare function addOneDay(dateISO: string): string;
export declare function addDays(dateISO: string, days: number): string;
export declare function datesInRange(from: string, to: string): Generator<string>;
