import { ParkingSpot } from './parking-spot.entity';
export declare class ParkingSpotSchedule {
    id: string;
    parkingSpotId: string;
    parkingSpot: ParkingSpot;
    dayOfWeek: number;
    startHour: number;
    endHour: number;
    createdAt: Date;
    updatedAt: Date;
}
