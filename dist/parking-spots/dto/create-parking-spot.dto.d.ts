import { ScheduleEntryDto } from './schedule-entry.dto';
export declare class CreateParkingSpotDto {
    title: string;
    description?: string;
    address: string;
    lat: number;
    lng: number;
    hourlyEnabled?: boolean;
    pricePerHour?: number;
    covered?: boolean;
    capacity?: number;
    instantBooking?: boolean;
    schedule?: ScheduleEntryDto[];
    rules?: string[];
    stayEnabled?: boolean;
    pricePerDay?: number;
    pricePerWeek?: number;
    pricePerMonth?: number;
    maxStayDays?: number;
    stayAvailableFrom?: string;
}
