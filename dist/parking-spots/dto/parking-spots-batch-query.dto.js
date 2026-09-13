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
exports.ParkingSpotsBatchQueryDto = void 0;
const class_validator_1 = require("class-validator");
const UUID_SHAPE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const COMMA_SEPARATED_UUIDS = new RegExp(`^${UUID_SHAPE}(,${UUID_SHAPE})*$`, 'i');
class ParkingSpotsBatchQueryDto {
}
exports.ParkingSpotsBatchQueryDto = ParkingSpotsBatchQueryDto;
__decorate([
    (0, class_validator_1.Matches)(COMMA_SEPARATED_UUIDS, { message: 'ids must be one or more UUIDs separated by commas' }),
    __metadata("design:type", String)
], ParkingSpotsBatchQueryDto.prototype, "ids", void 0);
//# sourceMappingURL=parking-spots-batch-query.dto.js.map