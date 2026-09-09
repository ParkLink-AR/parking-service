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

    // Backstop de ParkingSpotsService.validateStayCoherence: si stay_enabled
    // es true, las tres tarifas y la duración máxima tienen que estar
    // completas -- sin esto, un UPDATE que se salte la capa de servicio
    // (o un bug futuro en ella) podría dejar una cochera "con estadía
    // habilitada" pero sin precio, y StaysService no tendría de dónde cobrar.
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_parking_spots_stay_fields'
        ) THEN
          ALTER TABLE parking_spots
            ADD CONSTRAINT chk_parking_spots_stay_fields
            CHECK (
              stay_enabled = false
              OR (
                price_per_day IS NOT NULL AND price_per_day > 0
                AND price_per_week IS NOT NULL AND price_per_week > 0
                AND price_per_month IS NOT NULL AND price_per_month > 0
                AND max_stay_days IS NOT NULL AND max_stay_days >= 1
              )
            );
        END IF;
      END$$;
    `);

    // Backstop de la parte final de validateStayCoherence: si las dos
    // fechas de la ventana de estadía están cargadas, la de "hasta" no
    // puede ser anterior a la de "desde".
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_parking_spots_stay_window'
        ) THEN
          ALTER TABLE parking_spots
            ADD CONSTRAINT chk_parking_spots_stay_window
            CHECK (
              stay_available_from IS NULL
              OR stay_available_until IS NULL
              OR stay_available_until >= stay_available_from
            );
        END IF;
      END$$;
    `);

    // Backstop de ParkingSpotsService.validateHourlyCoherence: si
    // hourly_enabled es true, tiene que haber precio de una de las dos
    // formas -- único (price_per_hour) o por tipo de vehículo
    // (price_per_hour_by_vehicle_type, cuya forma exacta -- una entrada por
    // cada tipo en vehicle_types -- sólo se puede validar en el service, no
    // acá). Se recrea sin el guard IF NOT EXISTS habitual: a diferencia de
    // los demás CHECK de este archivo, este reemplaza una versión anterior
    // (sólo contemplaba price_per_hour) que ya puede existir en la DB.
    await this.dataSource.query(`
      ALTER TABLE parking_spots DROP CONSTRAINT IF EXISTS chk_parking_spots_hourly_fields;
    `);
    await this.dataSource.query(`
      ALTER TABLE parking_spots
        ADD CONSTRAINT chk_parking_spots_hourly_fields
        CHECK (
          hourly_enabled = false
          OR (price_per_hour IS NOT NULL AND price_per_hour > 0)
          OR price_per_hour_by_vehicle_type IS NOT NULL
        );
    `);

    // Una cochera tiene que ofrecer alquiler por hora, por estadía, o ambos
    // -- ninguna de las dos formas de reservarla puede estar apagada a la vez.
    await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_parking_spots_at_least_one_mode'
        ) THEN
          ALTER TABLE parking_spots
            ADD CONSTRAINT chk_parking_spots_at_least_one_mode
            CHECK (hourly_enabled = true OR stay_enabled = true);
        END IF;
      END$$;
    `);

    this.logger.log('Schema bootstrap OK (btree_gist, parking_spot_schedules + parking_spots constraints).');
  }
}
