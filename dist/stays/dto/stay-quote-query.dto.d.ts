export declare enum StayUnit {
    DAY = "day",
    WEEK = "week",
    MONTH = "month"
}
export declare class StayQuoteQueryDto {
    startDate: string;
    unit: StayUnit;
    count: number;
}
