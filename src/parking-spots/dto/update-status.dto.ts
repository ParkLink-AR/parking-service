import { IsIn } from 'class-validator';
import { ParkingSpotStatus } from '../entities/parking-spot.entity';

export class UpdateStatusDto {
  @IsIn([ParkingSpotStatus.ACTIVE, ParkingSpotStatus.PAUSED])
  status!: ParkingSpotStatus.ACTIVE | ParkingSpotStatus.PAUSED;
}
