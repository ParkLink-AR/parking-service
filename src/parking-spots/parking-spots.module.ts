import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSpot } from './entities/parking-spot.entity';
import { ParkingSpotSchedule } from './entities/parking-spot-schedule.entity';
import { ParkingSpotsService } from './parking-spots.service';
import { ParkingSpotsController } from './parking-spots.controller';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { AvailabilityModule } from '../availability/availability.module';
import { BookingClientModule } from '../booking-client/booking-client.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParkingSpot, ParkingSpotSchedule]),
    GeocodingModule,
    AvailabilityModule,
    BookingClientModule,
    StorageModule,
  ],
  controllers: [ParkingSpotsController],
  providers: [ParkingSpotsService],
  exports: [ParkingSpotsService],
})
export class ParkingSpotsModule {}
