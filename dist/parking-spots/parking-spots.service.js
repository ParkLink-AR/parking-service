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
const BASE_COLUMNS = [
    ['spot.id', 'id'],
    ['spot.ownerId', 'ownerId'],
    ['spot.title', 'title'],
    ['spot.description', 'description'],
    ['spot.address', 'address'],
    ['spot.pricePerHour', 'pricePerHour'],
    ['spot.covered', 'covered'],
    ['spot.scheduleText', 'scheduleText'],
    ['spot.photos', 'photos'],
    ['spot.rules', 'rules'],
    ['spot.status', 'status'],
    ['spot.createdAt', 'createdAt'],
    ['spot.updatedAt', 'updatedAt'],
];
function selectBaseColumns(qb) {
    const [first, ...rest] = BASE_COLUMNS;
    qb.select(first[0], first[1]);
    for (const [column, alias] of rest)
        qb.addSelect(column, alias);
    return qb;
}
function toResponse(raw, distanceMeters) {
    return {
        id: raw.id,
        ownerId: raw.ownerId,
        title: raw.title,
        description: raw.description,
        address: raw.address,
        lat: parseFloat(raw.lat),
        lng: parseFloat(raw.lng),
        pricePerHour: parseFloat(raw.pricePerHour),
        covered: raw.covered,
        scheduleText: raw.scheduleText,
        photos: raw.photos ?? [],
        rules: raw.rules ?? [],
        status: raw.status,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        ...(distanceMeters !== undefined ? { distanceMeters: Math.round(distanceMeters) } : {}),
    };
}
let ParkingSpotsService = class ParkingSpotsService {
    constructor(parkingSpotRepo, geocodingService) {
        this.parkingSpotRepo = parkingSpotRepo;
        this.geocodingService = geocodingService;
    }
    async search(filters) {
        const origin = `ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography`;
        const query = selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
            .addSelect('ST_X(spot.location::geometry)', 'lng')
            .addSelect('ST_Y(spot.location::geometry)', 'lat')
            .addSelect(`ST_Distance(spot.location, ${origin})`, 'distanceM')
            .where('spot.status = :status', { status: parking_spot_entity_1.ParkingSpotStatus.ACTIVE })
            .andWhere(`ST_DWithin(spot.location, ${origin}, :radius)`, {
            lat: filters.lat,
            lng: filters.lng,
            radius: filters.radius,
        })
            .orderBy('"distanceM"', 'ASC');
        if (filters.maxPrice !== undefined) {
            query.andWhere('spot.pricePerHour <= :maxPrice', {
                maxPrice: filters.maxPrice,
            });
        }
        if (filters.covered !== undefined) {
            query.andWhere('spot.covered = :covered', { covered: filters.covered });
        }
        const raw = await query.getRawMany();
        return raw.map((row) => toResponse(row, parseFloat(row.distanceM)));
    }
    async findById(id) {
        const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
            .addSelect('ST_X(spot.location::geometry)', 'lng')
            .addSelect('ST_Y(spot.location::geometry)', 'lat')
            .where('spot.id = :id', { id })
            .andWhere('spot.status = :status', { status: parking_spot_entity_1.ParkingSpotStatus.ACTIVE })
            .getRawOne();
        if (!raw) {
            throw new common_1.NotFoundException('Cochera no encontrada');
        }
        return toResponse(raw);
    }
    async create(dto, ownerId) {
        const geocoded = await this.geocodingService.geocodeAddress(dto.address);
        const spot = this.parkingSpotRepo.create({
            title: dto.title,
            description: dto.description,
            address: dto.address,
            pricePerHour: dto.pricePerHour,
            covered: dto.covered ?? false,
            scheduleText: dto.scheduleText ?? null,
            rules: dto.rules ?? [],
            ownerId,
            location: {
                type: 'Point',
                coordinates: [geocoded.lng, geocoded.lat],
            },
        });
        const saved = await this.parkingSpotRepo.save(spot);
        return this.findById(saved.id);
    }
    async findAllByOwner(ownerId) {
        const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
            .addSelect('ST_X(spot.location::geometry)', 'lng')
            .addSelect('ST_Y(spot.location::geometry)', 'lat')
            .where('spot.ownerId = :ownerId', { ownerId })
            .orderBy('spot.createdAt', 'DESC')
            .getRawMany();
        return raw.map((row) => toResponse(row));
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