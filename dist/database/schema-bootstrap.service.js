"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SchemaBootstrapService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaBootstrapService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let SchemaBootstrapService = SchemaBootstrapService_1 = class SchemaBootstrapService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(SchemaBootstrapService_1.name);
    }
    async onModuleInit() {
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
        await this.dataSource.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'chk_parking_spots_hourly_fields'
        ) THEN
          ALTER TABLE parking_spots
            ADD CONSTRAINT chk_parking_spots_hourly_fields
            CHECK (
              hourly_enabled = false
              OR (price_per_hour IS NOT NULL AND price_per_hour > 0)
            );
        END IF;
      END$$;
    `);
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
};
exports.SchemaBootstrapService = SchemaBootstrapService;
exports.SchemaBootstrapService = SchemaBootstrapService = SchemaBootstrapService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], SchemaBootstrapService);
//# sourceMappingURL=schema-bootstrap.service.js.map