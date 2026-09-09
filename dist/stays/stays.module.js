"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaysModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const parking_spot_entity_1 = require("../parking-spots/entities/parking-spot.entity");
const stays_service_1 = require("./stays.service");
const stays_controller_1 = require("./stays.controller");
const booking_client_module_1 = require("../booking-client/booking-client.module");
let StaysModule = class StaysModule {
};
exports.StaysModule = StaysModule;
exports.StaysModule = StaysModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([parking_spot_entity_1.ParkingSpot]), booking_client_module_1.BookingClientModule],
        controllers: [stays_controller_1.StaysController],
        providers: [stays_service_1.StaysService],
        exports: [stays_service_1.StaysService],
    })
], StaysModule);
//# sourceMappingURL=stays.module.js.map