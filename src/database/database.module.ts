import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSpot } from '../parking-spots/entities/parking-spot.entity';
import { ParkingSpotSchedule } from '../parking-spots/entities/parking-spot-schedule.entity';
import { SchemaBootstrapService } from './schema-bootstrap.service';
import { DevSeedService } from './dev-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingSpot, ParkingSpotSchedule])],
  providers: [SchemaBootstrapService, DevSeedService],
})
export class DatabaseModule {}
