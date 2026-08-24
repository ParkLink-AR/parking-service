import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSpot } from '../parking-spots/entities/parking-spot.entity';
import { AvailabilityService } from './availability.service';
import { BookingClientModule } from '../booking-client/booking-client.module';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingSpot]), BookingClientModule],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
