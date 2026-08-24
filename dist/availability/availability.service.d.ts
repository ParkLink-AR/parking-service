import { Repository } from 'typeorm';
import { ParkingSpot } from '../parking-spots/entities/parking-spot.entity';
import { ParkingSpotSchedule } from '../parking-spots/entities/parking-spot-schedule.entity';
import { BookingClientService } from '../booking-client/booking-client.service';
import { AvailabilityStatus } from './interval-math';
export interface DayAvailabilityResponse {
    date: string;
    status: AvailabilityStatus;
    free_windows: Array<{
        start: string;
        end: string;
    }>;
}
export declare class AvailabilityService {
    private readonly parkingSpotRepo;
    private readonly scheduleRepo;
    private readonly bookingClient;
    constructor(parkingSpotRepo: Repository<ParkingSpot>, scheduleRepo: Repository<ParkingSpotSchedule>, bookingClient: BookingClientService);
    getAvailability(parkingSpotId: string, from: string, to: string): Promise<{
        days: DayAvailabilityResponse[];
    }>;
    private validateRange;
}
