import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSpot } from './entities/parking-spot.entity';
import { ParkingSpotsService } from './parking-spots.service';
import { ParkingSpotsController } from './parking-spots.controller';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [TypeOrmModule.forFeature([ParkingSpot]), GeocodingModule],
  controllers: [ParkingSpotsController],
  providers: [ParkingSpotsService],
})
export class ParkingSpotsModule {}
