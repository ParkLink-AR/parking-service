import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { ParkingSpotsModule } from './parking-spots/parking-spots.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { FavoritesModule } from './favorites/favorites.module';
import { DatabaseModule } from './database/database.module';
import { StaysModule } from './stays/stays.module';
import { DemoModule } from './demo/demo.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig,
    }),
    DatabaseModule,
    ParkingSpotsModule,
    GeocodingModule,
    FavoritesModule,
    StaysModule,
    DemoModule,
  ],
})
export class AppModule {}
