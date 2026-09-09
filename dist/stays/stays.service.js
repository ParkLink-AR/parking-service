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
exports.StaysService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const parking_spot_entity_1 = require("../parking-spots/entities/parking-spot.entity");
const booking_client_service_1 = require("../booking-client/booking-client.service");
const stay_quote_query_dto_1 = require("./dto/stay-quote-query.dto");
const buenos_aires_time_1 = require("../availability/buenos-aires-time");
const interval_math_1 = require("../availability/interval-math");
const UNIT_DAYS = {
    [stay_quote_query_dto_1.StayUnit.DAY]: 1,
    [stay_quote_query_dto_1.StayUnit.WEEK]: 7,
    [stay_quote_query_dto_1.StayUnit.MONTH]: 30,
};
let StaysService = class StaysService {
    constructor(parkingSpotRepo, bookingClient) {
        this.parkingSpotRepo = parkingSpotRepo;
        this.bookingClient = bookingClient;
    }
    async getQuote(parkingSpotId, startDate, unit, count) {
        const spot = await this.parkingSpotRepo.findOne({
            where: { id: parkingSpotId, status: parking_spot_entity_1.ParkingSpotStatus.ACTIVE },
        });
        if (!spot) {
            throw new common_1.NotFoundException('Cochera no encontrada');
        }
        if (!spot.stayEnabled) {
            throw new common_1.BadRequestException('Esta cochera no tiene habilitada la opción de estadía.');
        }
        const rate = this.rateFor(spot, unit);
        const totalDays = UNIT_DAYS[unit] * count;
        const endDate = (0, buenos_aires_time_1.addDays)(startDate, totalDays);
        const today = new Date().toISOString().slice(0, 10);
        const availableFrom = spot.stayAvailableFrom ?? today;
        if (startDate < availableFrom) {
            throw new common_1.BadRequestException(`Esta cochera acepta estadías a partir del ${availableFrom}.`);
        }
        if (spot.maxStayDays !== null && totalDays > spot.maxStayDays) {
            throw new common_1.BadRequestException(`La duración máxima de estadía para esta cochera es de ${spot.maxStayDays} días.`);
        }
        await this.assertRangeFree(spot, startDate, endDate);
        return {
            startDate,
            endDate,
            unit,
            count,
            totalDays,
            amount: Math.round(rate * count * 100),
        };
    }
    async assertRangeFree(spot, startDate, endDate) {
        const activeBookings = await this.bookingClient.getActiveBookings(spot.id, startDate, endDate);
        const stayWindow = { start: (0, buenos_aires_time_1.buenosAiresMidnight)(startDate), end: (0, buenos_aires_time_1.buenosAiresMidnight)(endDate) };
        const checkWindow = {
            start: stayWindow.start.getTime() > Date.now() ? stayWindow.start : new Date(),
            end: stayWindow.end,
        };
        const free = (0, interval_math_1.subtractIntervalsWithCapacity)([checkWindow], activeBookings, spot.capacity);
        const fullyFree = free.length === 1 &&
            free[0].start.getTime() === checkWindow.start.getTime() &&
            free[0].end.getTime() === checkWindow.end.getTime();
        if (!fullyFree) {
            throw new common_1.ConflictException('Esa cochera ya tiene otra reserva que se superpone con esas fechas.');
        }
    }
    rateFor(spot, unit) {
        const rate = unit === stay_quote_query_dto_1.StayUnit.DAY ? spot.pricePerDay : unit === stay_quote_query_dto_1.StayUnit.WEEK ? spot.pricePerWeek : spot.pricePerMonth;
        if (rate === null) {
            throw new common_1.BadRequestException('La cochera no tiene cargada la tarifa para esa unidad de estadía.');
        }
        return rate;
    }
};
exports.StaysService = StaysService;
exports.StaysService = StaysService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(parking_spot_entity_1.ParkingSpot)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        booking_client_service_1.BookingClientService])
], StaysService);
//# sourceMappingURL=stays.service.js.map