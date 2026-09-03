import { ParkingSpot } from '../../parking-spots/entities/parking-spot.entity';
export declare class Favorite {
    id: string;
    userId: string;
    parkingSpotId: string;
    parkingSpot: ParkingSpot;
    createdAt: Date;
}
