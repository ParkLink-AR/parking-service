import { ScheduleEntryDto } from './schedule-entry.dto';
export declare class CreateParkingSpotDto {
    title: string;
    description?: string;
    address: string;
    lat: number;
    lng: number;
    pricePerHour: number;
    covered?: boolean;
    instantBooking?: boolean;
    schedule?: ScheduleEntryDto[];
    rules?: string[];
}
