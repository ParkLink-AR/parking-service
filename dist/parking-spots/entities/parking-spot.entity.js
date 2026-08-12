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
exports.ParkingSpot = exports.ParkingSpotStatus = void 0;
const typeorm_1 = require("typeorm");
var ParkingSpotStatus;
(function (ParkingSpotStatus) {
    ParkingSpotStatus["ACTIVE"] = "active";
    ParkingSpotStatus["PAUSED"] = "paused";
    ParkingSpotStatus["DELETED"] = "deleted";
})(ParkingSpotStatus || (exports.ParkingSpotStatus = ParkingSpotStatus = {}));
let ParkingSpot = class ParkingSpot {
};
exports.ParkingSpot = ParkingSpot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ParkingSpot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ name: 'owner_id', type: 'varchar' }),
    __metadata("design:type", String)
], ParkingSpot.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], ParkingSpot.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ParkingSpot.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], ParkingSpot.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Index)({ spatial: true }),
    (0, typeorm_1.Column)({
        type: 'geography',
        spatialFeatureType: 'Point',
        srid: 4326,
    }),
    __metadata("design:type", Object)
], ParkingSpot.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], ParkingSpot.prototype, "pricePerHour", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], ParkingSpot.prototype, "photos", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], ParkingSpot.prototype, "rules", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ParkingSpotStatus,
        default: ParkingSpotStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], ParkingSpot.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ParkingSpot.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ParkingSpot.prototype, "updatedAt", void 0);
exports.ParkingSpot = ParkingSpot = __decorate([
    (0, typeorm_1.Entity)('parking_spots')
], ParkingSpot);
//# sourceMappingURL=parking-spot.entity.js.map