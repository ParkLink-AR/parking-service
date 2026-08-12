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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParkingSpotsController = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const parking_spots_service_1 = require("./parking-spots.service");
const search_parking_spot_dto_1 = require("./dto/search-parking-spot.dto");
const create_parking_spot_dto_1 = require("./dto/create-parking-spot.dto");
let ParkingSpotsController = class ParkingSpotsController {
    constructor(parkingSpotsService) {
        this.parkingSpotsService = parkingSpotsService;
    }
    search(filters) {
        return this.parkingSpotsService.search(filters);
    }
    findById(id) {
        return this.parkingSpotsService.findById(id);
    }
    create(dto) {
        const ownerId = (0, uuid_1.v4)();
        return this.parkingSpotsService.create(dto, ownerId);
    }
    findAllByOwner(id) {
        return this.parkingSpotsService.findAllByOwner(id);
    }
};
exports.ParkingSpotsController = ParkingSpotsController;
__decorate([
    (0, common_1.Get)('parking-spots/search'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_parking_spot_dto_1.SearchParkingSpotDto]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('parking-spots/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "findById", null);
__decorate([
    (0, common_1.Post)('parking-spots'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_parking_spot_dto_1.CreateParkingSpotDto]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('users/:id/parking-spots'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "findAllByOwner", null);
exports.ParkingSpotsController = ParkingSpotsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [parking_spots_service_1.ParkingSpotsService])
], ParkingSpotsController);
//# sourceMappingURL=parking-spots.controller.js.map