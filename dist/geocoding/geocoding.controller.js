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
exports.GeocodingController = void 0;
const common_1 = require("@nestjs/common");
const geocoding_service_1 = require("./geocoding.service");
const reverse_geocode_dto_1 = require("./dto/reverse-geocode.dto");
let GeocodingController = class GeocodingController {
    constructor(geocodingService) {
        this.geocodingService = geocodingService;
    }
    search(q) {
        if (!q || !q.trim()) {
            throw new common_1.BadRequestException('Query param "q" is required.');
        }
        return this.geocodingService.searchAddress(q.trim());
    }
    reverse({ lat, lng }) {
        return this.geocodingService.reverseGeocode(lat, lng);
    }
};
exports.GeocodingController = GeocodingController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GeocodingController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('reverse'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reverse_geocode_dto_1.ReverseGeocodeDto]),
    __metadata("design:returntype", void 0)
], GeocodingController.prototype, "reverse", null);
exports.GeocodingController = GeocodingController = __decorate([
    (0, common_1.Controller)('geocode'),
    __metadata("design:paramtypes", [geocoding_service_1.GeocodingService])
], GeocodingController);
//# sourceMappingURL=geocoding.controller.js.map