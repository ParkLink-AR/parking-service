import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSpot } from './entities/parking-spot.entity';
import { ParkingSpotSchedule } from './entities/parking-spot-schedule.entity';
import { ParkingSpotsService } from './parking-spots.service';
import { ParkingSpotsController } from './parking-spots.controller';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingSpot, ParkingSpotSchedule]), GeocodingModule, AvailabilityModule],
  controllers: [ParkingSpotsController],
  providers: [ParkingSpotsService],
})
export class ParkingSpotsModule {}
