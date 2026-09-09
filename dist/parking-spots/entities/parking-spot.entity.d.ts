import { ParkingSpotSchedule } from './parking-spot-schedule.entity';
export declare enum ParkingSpotStatus {
    ACTIVE = "active",
    PAUSED = "paused",
    DELETED = "deleted"
}
export declare class ParkingSpot {
    id: string;
    ownerId: string;
    title: string;
    description: string;
    address: string;
    location: any;
    hourlyEnabled: boolean;
    pricePerHour: number | null;
    stayEnabled: boolean;
    pricePerDay: number | null;
    pricePerWeek: number | null;
    pricePerMonth: number | null;
    stayAvailableFrom: string | null;
    maxStayDays: number | null;
    covered: boolean;
    instantBooking: boolean;
    capacity: number;
    schedule: ParkingSpotSchedule[];
    photos: string[];
    rules: string[];
    status: ParkingSpotStatus;
    createdAt: Date;
    updatedAt: Date;
}
