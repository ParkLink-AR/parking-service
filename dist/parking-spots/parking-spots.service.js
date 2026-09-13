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
var ParkingSpotsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParkingSpotsService = exports.MAX_PHOTOS = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const parking_spot_entity_1 = require("./entities/parking-spot.entity");
const parking_spot_schedule_entity_1 = require("./entities/parking-spot-schedule.entity");
const booking_client_service_1 = require("../booking-client/booking-client.service");
const vehicle_type_1 = require("./vehicle-type");
exports.MAX_PHOTOS = 10;
const BASE_COLUMNS = [
    ['spot.id', 'id'],
    ['spot.ownerId', 'ownerId'],
    ['spot.title', 'title'],
    ['spot.description', 'description'],
    ['spot.address', 'address'],
    ['spot.hourlyEnabled', 'hourlyEnabled'],
    ['spot.pricePerHour', 'pricePerHour'],
    ['spot.pricePerHourByVehicleType', 'pricePerHourByVehicleType'],
    ['spot.stayEnabled', 'stayEnabled'],
    ['spot.pricePerDay', 'pricePerDay'],
    ['spot.pricePerWeek', 'pricePerWeek'],
    ['spot.pricePerMonth', 'pricePerMonth'],
    ['spot.stayAvailableFrom', 'stayAvailableFrom'],
    ['spot.stayAvailableUntil', 'stayAvailableUntil'],
    ['spot.maxStayDays', 'maxStayDays'],
    ['spot.covered', 'covered'],
    ['spot.vehicleTypes', 'vehicleTypes'],
    ['spot.instantBooking', 'instantBooking'],
    ['spot.capacity', 'capacity'],
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
function parseNullableFloat(value) {
    return value === null || value === undefined ? null : parseFloat(value);
}
function toPlainDate(value) {
    if (value === null || value === undefined)
        return null;
    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(value).slice(0, 10);
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
        hourlyEnabled: raw.hourlyEnabled,
        pricePerHour: parseNullableFloat(raw.pricePerHour),
        pricePerHourByVehicleType: raw.pricePerHourByVehicleType ?? null,
        stayEnabled: raw.stayEnabled,
        pricePerDay: parseNullableFloat(raw.pricePerDay),
        pricePerWeek: parseNullableFloat(raw.pricePerWeek),
        pricePerMonth: parseNullableFloat(raw.pricePerMonth),
        stayAvailableFrom: toPlainDate(raw.stayAvailableFrom),
        stayAvailableUntil: toPlainDate(raw.stayAvailableUntil),
        maxStayDays: raw.maxStayDays === null || raw.maxStayDays === undefined ? null : Number(raw.maxStayDays),
        covered: raw.covered,
        vehicleTypes: raw.vehicleTypes ?? [vehicle_type_1.VehicleType.CAR],
        instantBooking: raw.instantBooking,
        capacity: Number(raw.capacity ?? 1),
        schedule,
        photos: raw.photos ?? [],
        rules: raw.rules ?? [],
        status: raw.status,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        rating: 0,
        reviewCount: 0,
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
let ParkingSpotsService = ParkingSpotsService_1 = class ParkingSpotsService {
    constructor(parkingSpotRepo, scheduleRepo, bookingClient) {
        this.parkingSpotRepo = parkingSpotRepo;
        this.scheduleRepo = scheduleRepo;
        this.bookingClient = bookingClient;
        this.logger = new common_1.Logger(ParkingSpotsService_1.name);
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
    async applyRatings(spots) {
        if (spots.length === 0)
            return spots;
        const ratings = await this.bookingClient.getRatings(spots.map((spot) => spot.id));
        for (const spot of spots) {
            const rating = ratings[spot.id];
            if (rating) {
                spot.rating = rating.rating;
                spot.reviewCount = rating.reviewCount;
            }
        }
        return spots;
    }
    async search(filters) {
        const origin = `ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography`;
        const query = selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
            .addSelect('ST_X(spot.location::geometry)', 'lng')
            .addSelect('ST_Y(spot.location::geometry)', 'lat')
            .addSelect(`ST_Distance(spot.location, ${origin})`, 'distanceM')
            .where('spot.status = :status', { status: parking_spot_entity_1.ParkingSpotStatus.ACTIVE })
            .setParameter('lat', filters.lat)
            .setParameter('lng', filters.lng)
            .orderBy('"distanceM"', 'ASC');
        if (filters.radius !== undefined) {
            query.andWhere(`ST_DWithin(spot.location, ${origin}, :radius)`, {
                radius: filters.radius,
            });
        }
        if (filters.maxPrice !== undefined) {
            query.andWhere(`(
          spot.pricePerHour <= :maxPrice
          OR EXISTS (
            SELECT 1 FROM jsonb_each_text(spot.pricePerHourByVehicleType) AS v(vehicle_type, price)
            WHERE price::numeric <= :maxPrice
          )
        )`, { maxPrice: filters.maxPrice });
        }
        if (filters.covered !== undefined) {
            query.andWhere('spot.covered = :covered', { covered: filters.covered });
        }
        if (filters.stayOnly) {
            query.andWhere('spot.stayEnabled = true');
            query.andWhere('(spot.stayAvailableUntil IS NULL OR spot.stayAvailableUntil >= CURRENT_DATE)');
        }
        if (filters.hourlyOnly) {
            query.andWhere('spot.hourlyEnabled = true');
        }
        if (filters.instantBooking) {
            query.andWhere('spot.instantBooking = true');
        }
        const raw = await query.getRawMany();
        const schedules = await this.scheduleForMany(raw.map((row) => row.id));
        const spots = raw.map((row) => toResponse(row, schedules.get(row.id) ?? [], parseFloat(row.distanceM)));
        await this.applyRatings(spots);
        if (filters.from === undefined || filters.to === undefined || spots.length === 0) {
            return spots;
        }
        try {
            const bookableIDs = new Set(await this.bookingClient.getBookableSpotIds(spots.map((spot) => ({ id: spot.id, capacity: spot.capacity })), filters.from, filters.to));
            return spots.filter((spot) => bookableIDs.has(spot.id));
        }
        catch (error) {
            this.logger.warn(`No se pudo filtrar por disponibilidad, booking-service no respondió: ${error}`);
            return spots;
        }
    }
    async findById(id) {
        const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
            .addSelect('ST_X(spot.location::geometry)', 'lng')
            .addSelect('ST_Y(spot.location::geometry)', 'lat')
            .where('spot.id = :id', { id })
            .andWhere('spot.status IN (:...statuses)', { statuses: [parking_spot_entity_1.ParkingSpotStatus.ACTIVE, parking_spot_entity_1.ParkingSpotStatus.PAUSED] })
            .getRawOne();
        if (!raw) {
            throw new common_1.NotFoundException('Cochera no encontrada');
        }
        const spot = toResponse(raw, await this.scheduleFor(id));
        await this.applyRatings([spot]);
        return spot;
    }
    async findByIds(ids) {
        if (ids.length === 0)
            return [];
        const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
            .addSelect('ST_X(spot.location::geometry)', 'lng')
            .addSelect('ST_Y(spot.location::geometry)', 'lat')
            .where('spot.id IN (:...ids)', { ids })
            .andWhere('spot.status IN (:...statuses)', { statuses: [parking_spot_entity_1.ParkingSpotStatus.ACTIVE, parking_spot_entity_1.ParkingSpotStatus.PAUSED] })
            .getRawMany();
        const schedules = await this.scheduleForMany(raw.map((row) => row.id));
        const spots = raw.map((row) => toResponse(row, schedules.get(row.id) ?? []));
        await this.applyRatings(spots);
        return spots;
    }
    async create(dto, ownerId) {
        if (dto.hourlyEnabled === false && !dto.stayEnabled) {
            throw new common_1.BadRequestException('La cochera tiene que ofrecer alquiler por hora, por estadía, o ambos.');
        }
        if (dto.schedule)
            validateNoScheduleOverlap(dto.schedule);
        const spot = this.parkingSpotRepo.create({
            title: dto.title,
            description: dto.description,
            address: dto.address,
            hourlyEnabled: dto.hourlyEnabled ?? true,
            pricePerHour: dto.hourlyEnabled === false || dto.pricePerHourByVehicleType ? null : dto.pricePerHour,
            pricePerHourByVehicleType: dto.hourlyEnabled === false ? null : (dto.pricePerHourByVehicleType ?? null),
            stayEnabled: dto.stayEnabled ?? false,
            pricePerDay: dto.stayEnabled ? dto.pricePerDay : null,
            pricePerWeek: dto.stayEnabled ? dto.pricePerWeek : null,
            pricePerMonth: dto.stayEnabled ? dto.pricePerMonth : null,
            maxStayDays: dto.stayEnabled ? dto.maxStayDays : null,
            stayAvailableFrom: dto.stayEnabled ? (dto.stayAvailableFrom ?? null) : null,
            stayAvailableUntil: dto.stayEnabled ? (dto.stayAvailableUntil ?? null) : null,
            covered: dto.covered ?? false,
            vehicleTypes: dto.vehicleTypes,
            instantBooking: dto.instantBooking ?? true,
            capacity: dto.capacity ?? 1,
            rules: dto.rules ?? [],
            ownerId,
            location: {
                type: 'Point',
                coordinates: [dto.lng, dto.lat],
            },
            schedule: dto.hourlyEnabled === false ? [] : (dto.schedule ?? []).map((entry) => this.scheduleRepo.create(entry)),
        });
        if (spot.hourlyEnabled)
            this.validateHourlyCoherence(spot);
        if (spot.stayEnabled)
            this.validateStayCoherence(spot);
        const saved = await this.parkingSpotRepo.save(spot);
        return this.findById(saved.id);
    }
    async update(id, dto) {
        const spot = await this.parkingSpotRepo.findOne({ where: { id } });
        if (!spot)
            throw new common_1.NotFoundException('Cochera no encontrada');
        if (dto.hourlyEnabled !== undefined)
            spot.hourlyEnabled = dto.hourlyEnabled;
        if (dto.pricePerHour !== undefined)
            spot.pricePerHour = dto.pricePerHour;
        if (dto.pricePerHourByVehicleType !== undefined) {
            spot.pricePerHourByVehicleType = dto.pricePerHourByVehicleType;
            if (dto.pricePerHourByVehicleType)
                spot.pricePerHour = null;
        }
        if (dto.description !== undefined)
            spot.description = dto.description;
        if (dto.covered !== undefined)
            spot.covered = dto.covered;
        if (dto.vehicleTypes !== undefined)
            spot.vehicleTypes = dto.vehicleTypes;
        if (dto.instantBooking !== undefined)
            spot.instantBooking = dto.instantBooking;
        if (dto.capacity !== undefined)
            spot.capacity = dto.capacity;
        if (dto.stayEnabled !== undefined)
            spot.stayEnabled = dto.stayEnabled;
        if (dto.pricePerDay !== undefined)
            spot.pricePerDay = dto.pricePerDay;
        if (dto.pricePerWeek !== undefined)
            spot.pricePerWeek = dto.pricePerWeek;
        if (dto.pricePerMonth !== undefined)
            spot.pricePerMonth = dto.pricePerMonth;
        if (dto.maxStayDays !== undefined)
            spot.maxStayDays = dto.maxStayDays;
        if (dto.stayAvailableFrom !== undefined)
            spot.stayAvailableFrom = dto.stayAvailableFrom;
        if (dto.stayAvailableUntil !== undefined)
            spot.stayAvailableUntil = dto.stayAvailableUntil;
        if (!spot.hourlyEnabled && !spot.stayEnabled) {
            throw new common_1.BadRequestException('La cochera tiene que ofrecer alquiler por hora, por estadía, o ambos.');
        }
        if (spot.hourlyEnabled)
            this.validateHourlyCoherence(spot);
        if (spot.stayEnabled)
            this.validateStayCoherence(spot);
        const changingLocation = dto.address !== undefined || dto.lat !== undefined || dto.lng !== undefined;
        if (changingLocation) {
            if (dto.address === undefined || dto.lat === undefined || dto.lng === undefined) {
                throw new common_1.BadRequestException('address, lat and lng must all be provided together to change the location.');
            }
            spot.address = dto.address;
            spot.title = dto.address.split(',')[0]?.trim() || dto.address;
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
    validateStayCoherence(spot) {
        if (spot.pricePerDay === null ||
            spot.pricePerWeek === null ||
            spot.pricePerMonth === null ||
            spot.maxStayDays === null) {
            throw new common_1.BadRequestException('Para habilitar la estadía hay que cargar pricePerDay, pricePerWeek, pricePerMonth y maxStayDays.');
        }
        if (spot.stayAvailableFrom !== null &&
            spot.stayAvailableUntil !== null &&
            spot.stayAvailableUntil < spot.stayAvailableFrom) {
            throw new common_1.BadRequestException('stayAvailableUntil no puede ser anterior a stayAvailableFrom.');
        }
    }
    validateHourlyCoherence(spot) {
        if (spot.pricePerHourByVehicleType) {
            const byVehicle = spot.pricePerHourByVehicleType;
            for (const key of Object.keys(byVehicle)) {
                if (!vehicle_type_1.VEHICLE_TYPES.includes(key)) {
                    throw new common_1.BadRequestException(`Tipo de vehículo inválido en pricePerHourByVehicleType: ${key}`);
                }
            }
            for (const vehicleType of spot.vehicleTypes ?? []) {
                const price = byVehicle[vehicleType];
                if (typeof price !== 'number' || !(price > 0)) {
                    throw new common_1.BadRequestException(`Falta cargar pricePerHourByVehicleType.${vehicleType} (o no es un número positivo).`);
                }
            }
            return;
        }
        if (spot.pricePerHour === null) {
            throw new common_1.BadRequestException('Para habilitar el alquiler por hora hay que cargar pricePerHour, o un precio por tipo de vehículo.');
        }
    }
    async getOwnedSpot(id, ownerId) {
        const spot = await this.parkingSpotRepo.findOne({ where: { id } });
        if (!spot)
            throw new common_1.NotFoundException('Cochera no encontrada');
        if (spot.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('No sos el dueño de esta cochera.');
        }
        return spot;
    }
    async addPhotos(id, ownerId, urls) {
        const spot = await this.getOwnedSpot(id, ownerId);
        const current = spot.photos ?? [];
        if (current.length + urls.length > exports.MAX_PHOTOS) {
            throw new common_1.BadRequestException(`Una cochera puede tener hasta ${exports.MAX_PHOTOS} fotos.`);
        }
        spot.photos = [...current, ...urls];
        await this.parkingSpotRepo.save(spot);
        return this.findById(id);
    }
    async removePhoto(id, ownerId, url) {
        const spot = await this.getOwnedSpot(id, ownerId);
        spot.photos = (spot.photos ?? []).filter((photo) => photo !== url);
        await this.parkingSpotRepo.save(spot);
        return this.findById(id);
    }
    async reorderPhotos(id, ownerId, orderedUrls) {
        const spot = await this.getOwnedSpot(id, ownerId);
        const current = spot.photos ?? [];
        const sameSet = orderedUrls.length === current.length &&
            new Set(orderedUrls).size === current.length &&
            current.every((photo) => orderedUrls.includes(photo));
        if (!sameSet) {
            throw new common_1.BadRequestException('El nuevo orden debe contener exactamente las mismas fotos.');
        }
        spot.photos = orderedUrls;
        await this.parkingSpotRepo.save(spot);
        return this.findById(id);
    }
    async setStatus(id, ownerId, status) {
        const spot = await this.getOwnedSpot(id, ownerId);
        spot.status = status;
        await this.parkingSpotRepo.save(spot);
        return this.findById(id);
    }
    async remove(id, ownerId) {
        const spot = await this.getOwnedSpot(id, ownerId);
        const today = new Date().toISOString().slice(0, 10);
        const farFuture = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const activeBookings = await this.bookingClient.getActiveBookings(id, today, farFuture);
        if (activeBookings.length > 0) {
            throw new common_1.ConflictException('No se puede eliminar: hay reservas programadas que no finalizaron.');
        }
        const deletedPhotos = spot.photos ?? [];
        spot.status = parking_spot_entity_1.ParkingSpotStatus.DELETED;
        spot.photos = [];
        await this.parkingSpotRepo.save(spot);
        return deletedPhotos;
    }
    async removeAllForOwner(ownerId) {
        const spots = await this.parkingSpotRepo.find({ where: { ownerId } });
        if (spots.length === 0)
            return [];
        await this.parkingSpotRepo.remove(spots);
        return spots.flatMap((spot) => spot.photos ?? []);
    }
    async findAllByOwner(ownerId) {
        const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
            .addSelect('ST_X(spot.location::geometry)', 'lng')
            .addSelect('ST_Y(spot.location::geometry)', 'lat')
            .where('spot.ownerId = :ownerId', { ownerId })
            .andWhere('spot.status != :deleted', { deleted: parking_spot_entity_1.ParkingSpotStatus.DELETED })
            .orderBy('spot.createdAt', 'DESC')
            .getRawMany();
        const schedules = await this.scheduleForMany(raw.map((row) => row.id));
        const spots = raw.map((row) => toResponse(row, schedules.get(row.id) ?? []));
        await this.applyRatings(spots);
        return spots;
    }
};
exports.ParkingSpotsService = ParkingSpotsService;
exports.ParkingSpotsService = ParkingSpotsService = ParkingSpotsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(parking_spot_entity_1.ParkingSpot)),
    __param(1, (0, typeorm_1.InjectRepository)(parking_spot_schedule_entity_1.ParkingSpotSchedule)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        booking_client_service_1.BookingClientService])
], ParkingSpotsService);
//# sourceMappingURL=parking-spots.service.js.map