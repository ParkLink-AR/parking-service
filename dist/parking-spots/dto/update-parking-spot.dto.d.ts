import { ScheduleEntryDto } from './schedule-entry.dto';
export declare class UpdateParkingSpotDto {
    description?: string;
    hourlyEnabled?: boolean;
    pricePerHour?: number;
    covered?: boolean;
    instantBooking?: boolean;
    capacity?: number;
    schedule?: ScheduleEntryDto[];
    address?: string;
    lat?: number;
    lng?: number;
    stayEnabled?: boolean;
    pricePerDay?: number;
    pricePerWeek?: number;
    pricePerMonth?: number;
    maxStayDays?: number;
    stayAvailableFrom?: string;
}
