import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from './entities/parking-spot.entity';
import { ParkingSpotSchedule } from './entities/parking-spot-schedule.entity';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { ScheduleEntryDto } from './dto/schedule-entry.dto';
import { BookingClientService } from '../booking-client/booking-client.service';

export interface ScheduleEntryResponse {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
}

export const MAX_PHOTOS = 10;

// The `geography` column doesn't come back usable from a plain find()/findOne()
// (node-postgres returns raw EWKB for it) -- every read path goes through
// ST_X/ST_Y so callers (mobile, via the gateway) get plain lat/lng numbers.
export interface ParkingSpotResponse {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  address: string;
  lat: number;
  lng: number;
  pricePerHour: number;
  covered: boolean;
  schedule: ScheduleEntryResponse[];
  photos: string[];
  rules: string[];
  status: ParkingSpotStatus;
  createdAt: Date;
  updatedAt: Date;
  distanceMeters?: number;
}

// Explicit aliases (rather than getRawAndEntities()'s auto-generated ones)
// so the raw row shape is exactly what we ask for -- no guessing TypeORM's
// naming-strategy output for computed/geography columns.
const BASE_COLUMNS: Array<[string, string]> = [
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

function selectBaseColumns<T extends { select: Function; addSelect: Function }>(qb: T): T {
  const [first, ...rest] = BASE_COLUMNS;
  qb.select(first[0], first[1]);
  for (const [column, alias] of rest) qb.addSelect(column, alias);
  return qb;
}

function toResponse(
  raw: Record<string, any>,
  schedule: ScheduleEntryResponse[],
  distanceMeters?: number,
): ParkingSpotResponse {
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

function toScheduleResponse(rows: ParkingSpotSchedule[]): ScheduleEntryResponse[] {
  return rows
    .map((row) => ({ dayOfWeek: row.dayOfWeek, startHour: row.startHour, endHour: row.endHour }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour);
}

// Dos franjas del mismo día se pisan si una empieza antes de que la otra
// termine y viceversa -- mismo chequeo que booking-service usa para
// reservas (hasOverlap en create_booking_validation.go), acá aplicado
// dentro de un solo request en vez de contra la DB.
function overlaps(a: ScheduleEntryDto, b: ScheduleEntryDto): boolean {
  return a.startHour < b.endHour && b.startHour < a.endHour;
}

function validateNoScheduleOverlap(entries: ScheduleEntryDto[]): void {
  for (const entry of entries) {
    if (entry.startHour >= entry.endHour) {
      throw new BadRequestException(
        `Horario inválido para el día ${entry.dayOfWeek}: startHour debe ser menor que endHour.`,
      );
    }
  }

  const byDay = new Map<number, ScheduleEntryDto[]>();
  for (const entry of entries) {
    const dayEntries = byDay.get(entry.dayOfWeek) ?? [];
    dayEntries.push(entry);
    byDay.set(entry.dayOfWeek, dayEntries);
  }

  for (const [dayOfWeek, dayEntries] of byDay) {
    for (let i = 0; i < dayEntries.length; i++) {
      for (let j = i + 1; j < dayEntries.length; j++) {
        if (overlaps(dayEntries[i], dayEntries[j])) {
          throw new BadRequestException(`Hay franjas horarias superpuestas para el día ${dayOfWeek}.`);
        }
      }
    }
  }
}

@Injectable()
export class ParkingSpotsService {
  private readonly logger = new Logger(ParkingSpotsService.name);

  constructor(
    @InjectRepository(ParkingSpot)
    private readonly parkingSpotRepo: Repository<ParkingSpot>,
    @InjectRepository(ParkingSpotSchedule)
    private readonly scheduleRepo: Repository<ParkingSpotSchedule>,
    private readonly bookingClient: BookingClientService,
  ) {}

  private async scheduleFor(parkingSpotId: string): Promise<ScheduleEntryResponse[]> {
    const rows = await this.scheduleRepo.find({ where: { parkingSpotId } });
    return toScheduleResponse(rows);
  }

  private async scheduleForMany(parkingSpotIds: string[]): Promise<Map<string, ScheduleEntryResponse[]>> {
    if (parkingSpotIds.length === 0) return new Map();
    const rows = await this.scheduleRepo.find({ where: { parkingSpotId: In(parkingSpotIds) } });
    const byId = new Map<string, ParkingSpotSchedule[]>();
    for (const row of rows) {
      const list = byId.get(row.parkingSpotId) ?? [];
      list.push(row);
      byId.set(row.parkingSpotId, list);
    }
    const result = new Map<string, ScheduleEntryResponse[]>();
    for (const id of parkingSpotIds) {
      result.set(id, toScheduleResponse(byId.get(id) ?? []));
    }
    return result;
  }

  /**
   * Búsqueda geoespacial usando ST_DWithin de PostGIS.
   * ST_DWithin compara la distancia real (en metros, gracias al tipo `geography`)
   * entre la cochera y el punto de búsqueda, sin necesidad de llamar a ninguna API externa.
   */
  async search(filters: SearchParkingSpotDto): Promise<ParkingSpotResponse[]> {
    const origin = `ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography`;
    const query = selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
      .addSelect('ST_X(spot.location::geometry)', 'lng')
      .addSelect('ST_Y(spot.location::geometry)', 'lat')
      .addSelect(`ST_Distance(spot.location, ${origin})`, 'distanceM')
      .where('spot.status = :status', { status: ParkingSpotStatus.ACTIVE })
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
    const spots = raw.map((row) => toResponse(row, schedules.get(row.id) ?? [], parseFloat(row.distanceM)));

    if (filters.from === undefined || filters.to === undefined || spots.length === 0) {
      return spots;
    }

    try {
      const bookableIDs = new Set(
        await this.bookingClient.getBookableSpotIds(
          spots.map((spot) => spot.id),
          filters.from,
          filters.to,
        ),
      );
      return spots.filter((spot) => bookableIDs.has(spot.id));
    } catch (error) {
      // booking-service caído: mostramos la búsqueda sin el filtro de horario
      // en vez de romperla entera -- mejor resultados sin garantía de
      // disponibilidad que ningún resultado.
      this.logger.warn(`No se pudo filtrar por disponibilidad, booking-service no respondió: ${error}`);
      return spots;
    }
  }

  async findById(id: string): Promise<ParkingSpotResponse> {
    const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
      .addSelect('ST_X(spot.location::geometry)', 'lng')
      .addSelect('ST_Y(spot.location::geometry)', 'lat')
      .where('spot.id = :id', { id })
      .andWhere('spot.status = :status', { status: ParkingSpotStatus.ACTIVE })
      .getRawOne();

    if (!raw) {
      throw new NotFoundException('Cochera no encontrada');
    }

    return toResponse(raw, await this.scheduleFor(id));
  }

  /**
   * Crea una cochera en las coordenadas provistas -- el mobile ya las
   * resolvió antes de mandar esto (eligiendo una entre varias vía
   * GET /geocode si el dueño tipeó una dirección, o el GPS del dispositivo
   * si usó su ubicación actual), así que create() no vuelve a geocodificar.
   */
  async create(dto: CreateParkingSpotDto, ownerId: string): Promise<ParkingSpotResponse> {
    if (dto.schedule) validateNoScheduleOverlap(dto.schedule);

    const spot = this.parkingSpotRepo.create({
      title: dto.title,
      description: dto.description,
      address: dto.address,
      pricePerHour: dto.pricePerHour,
      covered: dto.covered ?? false,
      rules: dto.rules ?? [],
      ownerId,
      // GeoJSON format: TypeORM/PostGIS espera { type: 'Point', coordinates: [lng, lat] }
      location: {
        type: 'Point',
        coordinates: [dto.lng, dto.lat],
      },
      schedule: (dto.schedule ?? []).map((entry) => this.scheduleRepo.create(entry)),
    });

    const saved = await this.parkingSpotRepo.save(spot);
    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateParkingSpotDto): Promise<ParkingSpotResponse> {
    const spot = await this.parkingSpotRepo.findOne({ where: { id } });
    if (!spot) throw new NotFoundException('Cochera no encontrada');

    if (dto.pricePerHour !== undefined) spot.pricePerHour = dto.pricePerHour;
    if (dto.description !== undefined) spot.description = dto.description;
    if (dto.covered !== undefined) spot.covered = dto.covered;

    const changingLocation = dto.address !== undefined || dto.lat !== undefined || dto.lng !== undefined;
    if (changingLocation) {
      if (dto.address === undefined || dto.lat === undefined || dto.lng === undefined) {
        throw new BadRequestException('address, lat and lng must all be provided together to change the location.');
      }
      spot.address = dto.address;
      // GeoJSON format: TypeORM/PostGIS espera { type: 'Point', coordinates: [lng, lat] }
      spot.location = { type: 'Point', coordinates: [dto.lng, dto.lat] };
    }

    await this.parkingSpotRepo.save(spot);

    if (dto.schedule !== undefined) {
      validateNoScheduleOverlap(dto.schedule);
      await this.replaceSchedule(id, dto.schedule);
    }

    return this.findById(id);
  }

  /**
   * Reemplazo completo del horario de una cochera. Borra-y-reinserta en una
   * transacción explícita en vez de reasignar spot.schedule + cascade: el
   * SubjectExecutor de TypeORM corre los INSERTs antes que los REMOVEs de
   * orphanedRowAction, así que las filas nuevas chocan con las viejas
   * (todavía no borradas) contra el EXCLUDE -- verificado en la práctica.
   */
  private async replaceSchedule(parkingSpotId: string, entries: ScheduleEntryDto[]): Promise<void> {
    await this.scheduleRepo.manager.transaction(async (manager) => {
      await manager.delete(ParkingSpotSchedule, { parkingSpotId });
      if (entries.length > 0) {
        const rows = entries.map((entry) => manager.create(ParkingSpotSchedule, { parkingSpotId, ...entry }));
        await manager.save(rows);
      }
    });
  }

  private async getOwnedSpot(id: string, ownerId: string): Promise<ParkingSpot> {
    const spot = await this.parkingSpotRepo.findOne({ where: { id } });
    if (!spot) throw new NotFoundException('Cochera no encontrada');
    if (spot.ownerId !== ownerId) {
      throw new ForbiddenException('No sos el dueño de esta cochera.');
    }
    return spot;
  }

  // La portada es siempre photos[0] (misma convención que usa mobile al
  // mostrar la ficha de una cochera) -- no hay una columna `isCover` aparte.
  async addPhotos(id: string, ownerId: string, urls: string[]): Promise<ParkingSpotResponse> {
    const spot = await this.getOwnedSpot(id, ownerId);
    const current = spot.photos ?? [];
    if (current.length + urls.length > MAX_PHOTOS) {
      throw new BadRequestException(`Una cochera puede tener hasta ${MAX_PHOTOS} fotos.`);
    }
    spot.photos = [...current, ...urls];
    await this.parkingSpotRepo.save(spot);
    return this.findById(id);
  }

  async removePhoto(id: string, ownerId: string, url: string): Promise<ParkingSpotResponse> {
    const spot = await this.getOwnedSpot(id, ownerId);
    spot.photos = (spot.photos ?? []).filter((photo) => photo !== url);
    await this.parkingSpotRepo.save(spot);
    return this.findById(id);
  }

  // Reordena únicamente -- no acepta URLs nuevas ni permite perder alguna
  // existente, así mobile puede "marcar portada" moviendo una foto al
  // índice 0 sin poder corromper el set de fotos por accidente.
  async reorderPhotos(id: string, ownerId: string, orderedUrls: string[]): Promise<ParkingSpotResponse> {
    const spot = await this.getOwnedSpot(id, ownerId);
    const current = spot.photos ?? [];
    const sameSet =
      orderedUrls.length === current.length &&
      new Set(orderedUrls).size === current.length &&
      current.every((photo) => orderedUrls.includes(photo));
    if (!sameSet) {
      throw new BadRequestException('El nuevo orden debe contener exactamente las mismas fotos.');
    }
    spot.photos = orderedUrls;
    await this.parkingSpotRepo.save(spot);
    return this.findById(id);
  }

  async findAllByOwner(ownerId: string): Promise<ParkingSpotResponse[]> {
    const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
      .addSelect('ST_X(spot.location::geometry)', 'lng')
      .addSelect('ST_Y(spot.location::geometry)', 'lat')
      .where('spot.ownerId = :ownerId', { ownerId })
      .orderBy('spot.createdAt', 'DESC')
      .getRawMany();

    const schedules = await this.scheduleForMany(raw.map((row) => row.id));
    return raw.map((row) => toResponse(row, schedules.get(row.id) ?? []));
  }
}
