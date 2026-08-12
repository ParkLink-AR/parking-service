import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ParkingSpot } from '../parking-spots/entities/parking-spot.entity';

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [ParkingSpot],
  // synchronize solo para desarrollo/TFI. En un entorno real se reemplaza por migraciones.
  synchronize: true,
  logging: ['error', 'warn'],
});
