import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

// Constraints que `synchronize: true` no sabe crear (btree_gist, CHECK,
// EXCLUDE USING GIST). Corre una vez al levantar la app, después de que
// TypeOrmModule ya sincronizó las tablas -- por eso puede asumir que
// parking_spot_schedules ya existe. Todo el SQL es idempotente (misma
// convención que usan las migraciones de booking-service: DO $$ ... IF NOT
// EXISTS ... $$) porque acá no hay noción de "ya corrió esta migración".
@Injectable()
export class SchemaBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(SchemaBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS btree_gist;');

    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_parking_spot_schedules_hours'
        ) THEN
          ALTER TABLE parking_spot_schedules
            ADD CONSTRAINT chk_parking_spot_schedules_hours
            CHECK (start_hour >= 0 AND start_hour < 24 AND end_hour > start_hour AND end_hour <= 24);
        END IF;
      END$$;
    `);

    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'excl_parking_spot_schedules_no_overlap'
        ) THEN
          ALTER TABLE parking_spot_schedules
            ADD CONSTRAINT excl_parking_spot_schedules_no_overlap
            EXCLUDE USING GIST (
              parking_spot_id WITH =,
              day_of_week WITH =,
              int4range(start_hour, end_hour) WITH &&
            );
        END IF;
      END$$;
    `);

    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_parking_spots_capacity'
        ) THEN
          ALTER TABLE parking_spots
            ADD CONSTRAINT chk_parking_spots_capacity CHECK (capacity >= 1);
        END IF;
      END$$;
    `);

    this.logger.log('Schema bootstrap OK (btree_gist, parking_spot_schedules + parking_spots constraints).');
  }
}
