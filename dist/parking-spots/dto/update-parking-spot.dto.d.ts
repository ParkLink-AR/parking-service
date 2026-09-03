import { ScheduleEntryDto } from './schedule-entry.dto';
export declare class UpdateParkingSpotDto {
    description?: string;
    pricePerHour?: number;
    covered?: boolean;
    instantBooking?: boolean;
    schedule?: ScheduleEntryDto[];
    address?: string;
    lat?: number;
    lng?: number;
}
