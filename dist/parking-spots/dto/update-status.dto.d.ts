import { ParkingSpotStatus } from '../entities/parking-spot.entity';
export declare class UpdateStatusDto {
    status: ParkingSpotStatus.ACTIVE | ParkingSpotStatus.PAUSED;
}
