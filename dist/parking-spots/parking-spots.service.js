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
const parking_spot_schedule_entity_1 = require("./entities/parking-spot-schedule.entity");
const BASE_COLUMNS = [
    ['spot.id', 'id'],
    ['spot.ownerId', 'ownerId'],
    ['spot.title', 'title'],
    ['spot.description', 'description'],
    ['spot.address', 'address'],
    ['spot.pricePerHour', 'pricePerHour'],
    ['spot.covered', 'covered'],
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
function toResponse(raw, schedule, distanceMeters) {
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
        schedule,
        photos: raw.photos ?? [],
        rules: raw.rules ?? [],
        status: raw.status,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        ...(distanceMeters !== undefined ? { distanceMeters: Math.round(distanceMeters) } : {}),
    };
}
function toScheduleResponse(rows) {
    return rows
        .map((row) => ({ dayOfWeek: row.dayOfWeek, startHour: row.startHour, endHour: row.endHour }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour);
}
function overlaps(a, b) {
    return a.startHour < b.endHour && b.startHour < a.endHour;
}
function validateNoScheduleOverlap(entries) {
    for (const entry of entries) {
        if (entry.startHour >= entry.endHour) {
            throw new common_1.BadRequestException(`Horario inválido para el día ${entry.dayOfWeek}: startHour debe ser menor que endHour.`);
        }
    }
    const byDay = new Map();
    for (const entry of entries) {
        const dayEntries = byDay.get(entry.dayOfWeek) ?? [];
        dayEntries.push(entry);
        byDay.set(entry.dayOfWeek, dayEntries);
    }
    for (const [dayOfWeek, dayEntries] of byDay) {
        for (let i = 0; i < dayEntries.length; i++) {
            for (let j = i + 1; j < dayEntries.length; j++) {
                if (overlaps(dayEntries[i], dayEntries[j])) {
                    throw new common_1.BadRequestException(`Hay franjas horarias superpuestas para el día ${dayOfWeek}.`);
                }
            }
        }
    }
}
let ParkingSpotsService = class ParkingSpotsService {
    constructor(parkingSpotRepo, scheduleRepo) {
        this.parkingSpotRepo = parkingSpotRepo;
        this.scheduleRepo = scheduleRepo;
    }
    async scheduleFor(parkingSpotId) {
        const rows = await this.scheduleRepo.find({ where: { parkingSpotId } });
        return toScheduleResponse(rows);
    }
    async scheduleForMany(parkingSpotIds) {
        if (parkingSpotIds.length === 0)
            return new Map();
        const rows = await this.scheduleRepo.find({ where: { parkingSpotId: (0, typeorm_2.In)(parkingSpotIds) } });
        const byId = new Map();
        for (const row of rows) {
            const list = byId.get(row.parkingSpotId) ?? [];
            list.push(row);
            byId.set(row.parkingSpotId, list);
        }
        const result = new Map();
        for (const id of parkingSpotIds) {
            result.set(id, toScheduleResponse(byId.get(id) ?? []));
        }
        return result;
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
        const schedules = await this.scheduleForMany(raw.map((row) => row.id));
        return raw.map((row) => toResponse(row, schedules.get(row.id) ?? [], parseFloat(row.distanceM)));
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
        return toResponse(raw, await this.scheduleFor(id));
    }
    async create(dto, ownerId) {
        if (dto.schedule)
            validateNoScheduleOverlap(dto.schedule);
        const spot = this.parkingSpotRepo.create({
            title: dto.title,
            description: dto.description,
            address: dto.address,
            pricePerHour: dto.pricePerHour,
            covered: dto.covered ?? false,
            rules: dto.rules ?? [],
            ownerId,
            location: {
                type: 'Point',
                coordinates: [dto.lng, dto.lat],
            },
            schedule: (dto.schedule ?? []).map((entry) => this.scheduleRepo.create(entry)),
        });
        const saved = await this.parkingSpotRepo.save(spot);
        return this.findById(saved.id);
    }
    async update(id, dto) {
        const spot = await this.parkingSpotRepo.findOne({ where: { id } });
        if (!spot)
            throw new common_1.NotFoundException('Cochera no encontrada');
        if (dto.pricePerHour !== undefined)
            spot.pricePerHour = dto.pricePerHour;
        if (dto.description !== undefined)
            spot.description = dto.description;
        if (dto.covered !== undefined)
            spot.covered = dto.covered;
        const changingLocation = dto.address !== undefined || dto.lat !== undefined || dto.lng !== undefined;
        if (changingLocation) {
            if (dto.address === undefined || dto.lat === undefined || dto.lng === undefined) {
                throw new common_1.BadRequestException('address, lat and lng must all be provided together to change the location.');
            }
            spot.address = dto.address;
            spot.location = { type: 'Point', coordinates: [dto.lng, dto.lat] };
        }
        await this.parkingSpotRepo.save(spot);
        if (dto.schedule !== undefined) {
            validateNoScheduleOverlap(dto.schedule);
            await this.replaceSchedule(id, dto.schedule);
        }
        return this.findById(id);
    }
    async replaceSchedule(parkingSpotId, entries) {
        await this.scheduleRepo.manager.transaction(async (manager) => {
            await manager.delete(parking_spot_schedule_entity_1.ParkingSpotSchedule, { parkingSpotId });
            if (entries.length > 0) {
                const rows = entries.map((entry) => manager.create(parking_spot_schedule_entity_1.ParkingSpotSchedule, { parkingSpotId, ...entry }));
                await manager.save(rows);
            }
        });
    }
    async findAllByOwner(ownerId) {
        const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
            .addSelect('ST_X(spot.location::geometry)', 'lng')
            .addSelect('ST_Y(spot.location::geometry)', 'lat')
            .where('spot.ownerId = :ownerId', { ownerId })
            .orderBy('spot.createdAt', 'DESC')
            .getRawMany();
        const schedules = await this.scheduleForMany(raw.map((row) => row.id));
        return raw.map((row) => toResponse(row, schedules.get(row.id) ?? []));
    }
};
exports.ParkingSpotsService = ParkingSpotsService;
exports.ParkingSpotsService = ParkingSpotsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(parking_spot_entity_1.ParkingSpot)),
    __param(1, (0, typeorm_1.InjectRepository)(parking_spot_schedule_entity_1.ParkingSpotSchedule)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ParkingSpotsService);
//# sourceMappingURL=parking-spots.service.js.map