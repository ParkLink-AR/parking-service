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
exports.BookingClientService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let BookingClientService = class BookingClientService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
    }
    async getActiveBookings(parkingSpotId, from, to) {
        const baseUrl = this.configService.get('BOOKING_SERVICE_URL');
        let data;
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${baseUrl}/parking-spots/${parkingSpotId}/bookings`, {
                params: { active: 'true', from, to },
            }));
            data = response.data;
        }
        catch {
            throw new common_1.HttpException('booking-service is unavailable', common_1.HttpStatus.BAD_GATEWAY);
        }
        return data.bookings.flatMap((day) => day.bookings.map((booking) => ({ start: new Date(booking.start), end: new Date(booking.end) })));
    }
    async getBookableSpotIds(parkingSpotIds, start, end) {
        if (parkingSpotIds.length === 0)
            return [];
        const baseUrl = this.configService.get('BOOKING_SERVICE_URL');
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${baseUrl}/parking-spots/bookable`, {
                parking_spot_ids: parkingSpotIds,
                start,
                end,
            }));
            return response.data.bookable_parking_spot_ids;
        }
        catch {
            throw new common_1.HttpException('booking-service is unavailable', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
};
exports.BookingClientService = BookingClientService;
exports.BookingClientService = BookingClientService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], BookingClientService);
//# sourceMappingURL=booking-client.service.js.map