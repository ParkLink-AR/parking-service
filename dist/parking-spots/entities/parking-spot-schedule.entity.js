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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParkingSpotSchedule = void 0;
const typeorm_1 = require("typeorm");
const parking_spot_entity_1 = require("./parking-spot.entity");
let ParkingSpotSchedule = class ParkingSpotSchedule {
};
exports.ParkingSpotSchedule = ParkingSpotSchedule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ParkingSpotSchedule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'parking_spot_id', type: 'uuid' }),
    __metadata("design:type", String)
], ParkingSpotSchedule.prototype, "parkingSpotId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => parking_spot_entity_1.ParkingSpot, (spot) => spot.schedule, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'parking_spot_id' }),
    __metadata("design:type", parking_spot_entity_1.ParkingSpot)
], ParkingSpotSchedule.prototype, "parkingSpot", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'day_of_week', type: 'smallint' }),
    __metadata("design:type", Number)
], ParkingSpotSchedule.prototype, "dayOfWeek", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_hour', type: 'smallint' }),
    __metadata("design:type", Number)
], ParkingSpotSchedule.prototype, "startHour", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'end_hour', type: 'smallint' }),
    __metadata("design:type", Number)
], ParkingSpotSchedule.prototype, "endHour", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ParkingSpotSchedule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ParkingSpotSchedule.prototype, "updatedAt", void 0);
exports.ParkingSpotSchedule = ParkingSpotSchedule = __decorate([
    (0, typeorm_1.Entity)('parking_spot_schedules')
], ParkingSpotSchedule);
//# sourceMappingURL=parking-spot-schedule.entity.js.map