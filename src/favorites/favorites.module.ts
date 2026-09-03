import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { ParkingSpotsModule } from '../parking-spots/parking-spots.module';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite]), ParkingSpotsModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
