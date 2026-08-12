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
exports.ParkingSpotsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const parking_spot_entity_1 = require("./entities/parking-spot.entity");
const geocoding_service_1 = require("../geocoding/geocoding.service");
let ParkingSpotsService = class ParkingSpotsService {
    constructor(parkingSpotRepo, geocodingService) {
        this.parkingSpotRepo = parkingSpotRepo;
        this.geocodingService = geocodingService;
    }
    async search(filters) {
        const query = this.parkingSpotRepo
            .createQueryBuilder('spot')
            .where('spot.status = :status', { status: parking_spot_entity_1.ParkingSpotStatus.ACTIVE })
            .andWhere(`ST_DWithin(
          spot.location,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`, { lat: filters.lat, lng: filters.lng, radius: filters.radius });
        if (filters.maxPrice !== undefined) {
            query.andWhere('spot.pricePerHour <= :maxPrice', {
                maxPrice: filters.maxPrice,
            });
        }
        return query.getMany();
    }
    async findById(id) {
        const spot = await this.parkingSpotRepo.findOne({
            where: { id, status: parking_spot_entity_1.ParkingSpotStatus.ACTIVE },
        });
        if (!spot) {
            throw new common_1.NotFoundException('Cochera no encontrada');
        }
        return spot;
    }
    async create(dto, ownerId) {
        const geocoded = await this.geocodingService.geocodeAddress(dto.address);
        const spot = this.parkingSpotRepo.create({
            title: dto.title,
            description: dto.description,
            address: dto.address,
            pricePerHour: dto.pricePerHour,
            rules: dto.rules ?? [],
            ownerId,
            location: {
                type: 'Point',
                coordinates: [geocoded.lng, geocoded.lat],
            },
        });
        return this.parkingSpotRepo.save(spot);
    }
    async findAllByOwner(ownerId) {
        return this.parkingSpotRepo.find({
            where: { ownerId },
            order: { createdAt: 'DESC' },
        });
    }
};
exports.ParkingSpotsService = ParkingSpotsService;
exports.ParkingSpotsService = ParkingSpotsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(parking_spot_entity_1.ParkingSpot)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        geocoding_service_1.GeocodingService])
], ParkingSpotsService);
//# sourceMappingURL=parking-spots.service.js.map