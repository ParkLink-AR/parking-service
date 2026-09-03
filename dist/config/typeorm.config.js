"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeOrmConfig = void 0;
const parking_spot_entity_1 = require("../parking-spots/entities/parking-spot.entity");
const parking_spot_schedule_entity_1 = require("../parking-spots/entities/parking-spot-schedule.entity");
const favorite_entity_1 = require("../favorites/entities/favorite.entity");
const typeOrmConfig = () => ({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [parking_spot_entity_1.ParkingSpot, parking_spot_schedule_entity_1.ParkingSpotSchedule, favorite_entity_1.Favorite],
    synchronize: true,
    logging: ['error', 'warn'],
});
exports.typeOrmConfig = typeOrmConfig;
//# sourceMappingURL=typeorm.config.js.map