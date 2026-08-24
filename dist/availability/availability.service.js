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
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const parking_spot_entity_1 = require("../parking-spots/entities/parking-spot.entity");
const booking_client_service_1 = require("../booking-client/booking-client.service");
const schedule_mock_1 = require("./schedule-mock");
const buenos_aires_time_1 = require("./buenos-aires-time");
const interval_math_1 = require("./interval-math");
const MAX_RANGE_DAYS = 14;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let AvailabilityService = class AvailabilityService {
    constructor(parkingSpotRepo, bookingClient) {
        this.parkingSpotRepo = parkingSpotRepo;
        this.bookingClient = bookingClient;
    }
    async getAvailability(parkingSpotId, from, to) {
        this.validateRange(from, to);
        const spot = await this.parkingSpotRepo.findOne({
            where: { id: parkingSpotId, status: parking_spot_entity_1.ParkingSpotStatus.ACTIVE },
        });
        if (!spot) {
            throw new common_1.NotFoundException('Cochera no encontrada');
        }
        const activeBookings = await this.bookingClient.getActiveBookings(parkingSpotId, from, to);
        const days = [];
        for (const dateISO of (0, buenos_aires_time_1.datesInRange)(from, to)) {
            const baseWindows = (0, schedule_mock_1.publishedWindowsForDay)(dateISO);
            const baseIsEmpty = baseWindows.length === 0;
            let freeWindows = [];
            if (!baseIsEmpty) {
                const dayStart = (0, buenos_aires_time_1.buenosAiresMidnight)(dateISO);
                const dayEnd = new Date(dayStart.getTime() + ONE_DAY_MS);
                const dayBookings = (0, interval_math_1.filterOverlapping)(activeBookings, dayStart, dayEnd);
                freeWindows = (0, interval_math_1.subtractIntervals)(baseWindows, dayBookings);
            }
            days.push({
                date: dateISO,
                status: (0, interval_math_1.determineStatus)(baseIsEmpty, freeWindows),
                free_windows: freeWindows.map((window) => ({
                    start: (0, buenos_aires_time_1.formatBuenosAires)(window.start),
                    end: (0, buenos_aires_time_1.formatBuenosAires)(window.end),
                })),
            });
        }
        return { days };
    }
    validateRange(from, to) {
        if (from >= to) {
            throw new common_1.BadRequestException('from must be before to');
        }
        const rangeDays = Math.round(((0, buenos_aires_time_1.buenosAiresMidnight)(to).getTime() - (0, buenos_aires_time_1.buenosAiresMidnight)(from).getTime()) / ONE_DAY_MS);
        if (rangeDays > MAX_RANGE_DAYS) {
            throw new common_1.BadRequestException(`date range exceeds maximum of ${MAX_RANGE_DAYS} days`);
        }
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(parking_spot_entity_1.ParkingSpot)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        booking_client_service_1.BookingClientService])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map