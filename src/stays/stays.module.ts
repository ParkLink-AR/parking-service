import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSpot } from '../parking-spots/entities/parking-spot.entity';
import { StaysService } from './stays.service';
import { StaysController } from './stays.controller';
import { BookingClientModule } from '../booking-client/booking-client.module';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingSpot]), BookingClientModule],
  controllers: [StaysController],
  providers: [StaysService],
  exports: [StaysService],
})
export class StaysModule {}
