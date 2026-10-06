import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from './entities/parking-spot.entity';
import { ParkingSpotSchedule } from './entities/parking-spot-schedule.entity';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { ScheduleEntryDto } from './dto/schedule-entry.dto';
import { BookingClientService } from '../booking-client/booking-client.service';
import { AuthClientService } from '../auth-client/auth-client.service';
import { VehicleType, VEHICLE_TYPES } from './vehicle-type';

export interface ScheduleEntryResponse {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
}

export const MAX_PHOTOS = 10;
export const MAX_VERIFICATION_PHOTOS = 5;

// Todo estado salvo DELETED resuelve acá -- lo comparten el detalle público
// (driver) y la pantalla de administración del dueño (mobile spots/[id].tsx
// llama a este mismo findById para ambos casos), así que una cochera
// PENDING_REVIEW o REJECTED tiene que poder verse igual que una PAUSED.
const VISIBLE_STATUSES = [
  ParkingSpotStatus.ACTIVE,
  ParkingSpotStatus.PAUSED,
  ParkingSpotStatus.PENDING_REVIEW,
  ParkingSpotStatus.REJECTED,
];

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
  // null cuando hourlyEnabled es false (una cochera "solo estadía" no
  // publica precio ni horario por hora).
  hourlyEnabled: boolean;
  pricePerHour: number | null;
  // Ver el comentario en la entidad -- no-null implica que pricePerHour de
  // arriba no aplica, el precio real sale de acá según qué vehículo elija
  // el conductor.
  pricePerHourByVehicleType: Partial<Record<VehicleType, number>> | null;
  // "Estadía": ver el comentario en la entidad ParkingSpot. Los precios
  // quedan en null cuando stayEnabled es false (una cochera común no tiene
  // por qué declararlos).
  stayEnabled: boolean;
  pricePerDay: number | null;
  pricePerWeek: number | null;
  pricePerMonth: number | null;
  stayAvailableFrom: string | null;
  stayAvailableUntil: string | null;
  maxStayDays: number | null;
  covered: boolean;
  vehicleTypes: VehicleType[];
  // Lugares idénticos que se alquilan contra este mismo id (playa). 1 = cochera común.
  capacity: number;
  schedule: ScheduleEntryResponse[];
  photos: string[];
  verificationPhotos: string[];
  reviewNotes: string | null;
  rules: string[];
  status: ParkingSpotStatus;
  createdAt: Date;
  updatedAt: Date;
  distanceMeters?: number;
  // Real numbers from booking-service's reviews table, merged in by
  // applyRatings() after toResponse() -- 0/0 here is just the fallback for
  // when that call fails, not the "no reviews yet" case (see applyRatings).
  rating: number;
  reviewCount: number;
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
  ['spot.capacity', 'capacity'],
  ['spot.photos', 'photos'],
  ['spot.verificationPhotos', 'verificationPhotos'],
  ['spot.reviewNotes', 'reviewNotes'],
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

// decimal/date columns nullable a nivel DB vuelven como null tal cual (no
// como el string "null"), pero parseFloat(null) da NaN -- este helper evita
// mandarle NaN al mobile cuando stayEnabled es false y las tarifas de
// estadía nunca se completaron.
function parseNullableFloat(value: unknown): number | null {
  return value === null || value === undefined ? null : parseFloat(value as string);
}

// getRawMany()/getRawOne() (usado por selectBaseColumns más abajo) evita por
// completo la hidratación de entidades de TypeORM -- una columna `date` no
// vuelve como el string "YYYY-MM-DD" que promete ParkingSpotResponse, sino
// como el Date crudo que arma el type parser de `pg` (ver node-postgres,
// OID 1082). Serializado a JSON eso sale como datetime completo
// ("...T00:00:00.000Z"), que rompe todo lo que espera fecha pura -- el
// cálculo de fechas de StaysService, y este mismo valor reenviado tal cual
// por mobile como startDate de una cotización de estadía. Los getters
// locales (no getUTC*) son la inversa correcta de cómo `pg` arma ese Date
// (con el constructor local `new Date(year, month, day)`), así que esto da
// el mismo año/mes/día sin importar en qué huso horario corra el proceso.
function toPlainDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
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
    // Filas anteriores a este campo quedan null -- toda cochera era
    // implícitamente para autos antes de que existiera esta selección.
    vehicleTypes: raw.vehicleTypes ?? [VehicleType.CAR],
    capacity: Number(raw.capacity ?? 1),
    schedule,
    photos: raw.photos ?? [],
    verificationPhotos: raw.verificationPhotos ?? [],
    reviewNotes: raw.reviewNotes ?? null,
    rules: raw.rules ?? [],
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    rating: 0,
    reviewCount: 0,
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
    private readonly authClient: AuthClientService,
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
   * Mezcla el rating/reviewCount real (de la tabla reviews en booking-service) en cada
   * respuesta, en un solo llamado batch. Muta y devuelve el mismo array -- si falla,
   * los spots se quedan con el 0/0 default de toResponse() en vez de romper el pedido.
   */
  private async applyRatings(spots: ParkingSpotResponse[]): Promise<ParkingSpotResponse[]> {
    if (spots.length === 0) return spots;
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
      .setParameter('lat', filters.lat)
      .setParameter('lng', filters.lng)
      .orderBy('"distanceM"', 'ASC');

    // Cuando el usuario elige un filtro de distancia se aplica ST_DWithin;
    // si no hay radio (primera apertura / "ver todo") se devuelven todas las
    // cocheras activas ordenadas por distancia, igual que un marketplace.
    if (filters.radius !== undefined) {
      query.andWhere(`ST_DWithin(spot.location, ${origin}, :radius)`, {
        radius: filters.radius,
      });
    }

    if (filters.maxPrice !== undefined) {
      // Cuando el precio varía por tipo de vehículo, spot.pricePerHour es
      // null (ver el comentario en la entidad) -- alcanza con que alguna
      // tarifa del mapa esté dentro del máximo para no descartar la cochera.
      query.andWhere(
        `(
          spot.pricePerHour <= :maxPrice
          OR EXISTS (
            SELECT 1 FROM jsonb_each_text(spot.pricePerHourByVehicleType) AS v(vehicle_type, price)
            WHERE price::numeric <= :maxPrice
          )
        )`,
        { maxPrice: filters.maxPrice },
      );
    }

    if (filters.covered !== undefined) {
      query.andWhere('spot.covered = :covered', { covered: filters.covered });
    }

    if (filters.stayOnly) {
      query.andWhere('spot.stayEnabled = true');
      // No mostrar cocheras cuya ventana de estadía ya venció -- ver el
      // comentario en ParkingSpot.stayAvailableUntil.
      query.andWhere('(spot.stayAvailableUntil IS NULL OR spot.stayAvailableUntil >= CURRENT_DATE)');
    }

    if (filters.hourlyOnly) {
      query.andWhere('spot.hourlyEnabled = true');
    }

    const raw = await query.getRawMany();
    const schedules = await this.scheduleForMany(raw.map((row) => row.id));
    const spots = raw.map((row) => toResponse(row, schedules.get(row.id) ?? [], parseFloat(row.distanceM)));
    await this.applyRatings(spots);

    if (filters.from === undefined || filters.to === undefined || spots.length === 0) {
      return spots;
    }

    try {
      const bookableIDs = new Set(
        await this.bookingClient.getBookableSpotIds(
          spots.map((spot) => ({ id: spot.id, capacity: spot.capacity })),
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
    // ACTIVE o PAUSED (no DELETED): una cochera pausada deja de aparecer en
    // search(), pero su detalle sigue resolviendo -- lo necesitan las
    // reservas ya hechas y los favoritos de quien la guardó antes de que el
    // dueño la pausara.
    const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
      .addSelect('ST_X(spot.location::geometry)', 'lng')
      .addSelect('ST_Y(spot.location::geometry)', 'lat')
      .where('spot.id = :id', { id })
      .andWhere('spot.status IN (:...statuses)', { statuses: VISIBLE_STATUSES })
      .getRawOne();

    if (!raw) {
      throw new NotFoundException('Cochera no encontrada');
    }

    const spot = toResponse(raw, await this.scheduleFor(id));
    await this.applyRatings([spot]);
    return spot;
  }

  /**
   * Detalle de varias cocheras de una sola vez -- usado por el mobile para
   * resolver los títulos de todas las cocheras de un historial de reservas
   * en un solo request en vez de uno por cochera. Mismo filtro de status que
   * findById (ACTIVE/PAUSED) para que el comportamiento de "no encontrada"
   * sea idéntico: acá simplemente esa cochera no aparece en el array.
   */
  async findByIds(ids: string[]): Promise<ParkingSpotResponse[]> {
    if (ids.length === 0) return [];

    const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
      .addSelect('ST_X(spot.location::geometry)', 'lng')
      .addSelect('ST_Y(spot.location::geometry)', 'lat')
      .where('spot.id IN (:...ids)', { ids })
      .andWhere('spot.status IN (:...statuses)', { statuses: VISIBLE_STATUSES })
      .getRawMany();

    const schedules = await this.scheduleForMany(raw.map((row) => row.id));
    const spots = raw.map((row) => toResponse(row, schedules.get(row.id) ?? []));
    await this.applyRatings(spots);
    return spots;
  }

  /**
   * Crea una cochera en las coordenadas provistas -- el mobile ya las
   * resolvió antes de mandar esto (eligiendo una entre varias vía
   * GET /geocode si el dueño tipeó una dirección, o el GPS del dispositivo
   * si usó su ubicación actual), así que create() no vuelve a geocodificar.
   */
  async create(dto: CreateParkingSpotDto, ownerId: string): Promise<ParkingSpotResponse> {
    if (!(await this.authClient.hasPayoutInfo(ownerId))) {
      throw new BadRequestException('PAYOUT_INFO_REQUIRED');
    }
    if (dto.hourlyEnabled === false && !dto.stayEnabled) {
      throw new BadRequestException('La cochera tiene que ofrecer alquiler por hora, por estadía, o ambos.');
    }
    if (dto.schedule) validateNoScheduleOverlap(dto.schedule);

    const spot = this.parkingSpotRepo.create({
      title: dto.title,
      description: dto.description,
      address: dto.address,
      hourlyEnabled: dto.hourlyEnabled ?? true,
      pricePerHour: dto.hourlyEnabled === false || dto.pricePerHourByVehicleType ? null : dto.pricePerHour!,
      pricePerHourByVehicleType: dto.hourlyEnabled === false ? null : (dto.pricePerHourByVehicleType ?? null),
      stayEnabled: dto.stayEnabled ?? false,
      pricePerDay: dto.stayEnabled ? dto.pricePerDay! : null,
      pricePerWeek: dto.stayEnabled ? dto.pricePerWeek! : null,
      pricePerMonth: dto.stayEnabled ? dto.pricePerMonth! : null,
      maxStayDays: dto.stayEnabled ? dto.maxStayDays! : null,
      stayAvailableFrom: dto.stayEnabled ? (dto.stayAvailableFrom ?? null) : null,
      stayAvailableUntil: dto.stayEnabled ? (dto.stayAvailableUntil ?? null) : null,
      covered: dto.covered ?? false,
      vehicleTypes: dto.vehicleTypes,
      capacity: dto.capacity ?? 1,
      rules: dto.rules ?? [],
      ownerId,
      // Toda cochera nueva arranca pendiente de revisión -- pasa a ACTIVE
      // recién cuando un admin aprueba la documentación (ver
      // addVerificationPhotos/reviewSpot). No aparece en search() hasta
      // entonces (search() sólo trae status ACTIVE).
      status: ParkingSpotStatus.PENDING_REVIEW,
      // GeoJSON format: TypeORM/PostGIS espera { type: 'Point', coordinates: [lng, lat] }
      location: {
        type: 'Point',
        coordinates: [dto.lng, dto.lat],
      },
      // Sin alquiler por hora no tiene sentido publicar un horario -- se
      // ignora lo que venga en dto.schedule igual que pasa con las tarifas
      // de estadía cuando stayEnabled es false.
      schedule: dto.hourlyEnabled === false ? [] : (dto.schedule ?? []).map((entry) => this.scheduleRepo.create(entry)),
    });

    // Las tarifas/maxStayDays/pricePerHour ya los exige el DTO vía
    // @ValidateIf, pero el orden stayAvailableFrom/Until no tiene
    // equivalente ahí -- sin este llamado, un stayAvailableUntil anterior a
    // stayAvailableFrom llegaba crudo hasta el CHECK de la DB y volvía como
    // 500 en vez de un 400 legible.
    if (spot.hourlyEnabled) this.validateHourlyCoherence(spot);
    if (spot.stayEnabled) this.validateStayCoherence(spot);

    const saved = await this.parkingSpotRepo.save(spot);
    return this.findById(saved.id);
  }

  async update(id: string, dto: UpdateParkingSpotDto): Promise<ParkingSpotResponse> {
    const spot = await this.parkingSpotRepo.findOne({ where: { id } });
    if (!spot) throw new NotFoundException('Cochera no encontrada');

    if (dto.hourlyEnabled !== undefined) spot.hourlyEnabled = dto.hourlyEnabled;
    if (dto.pricePerHour !== undefined) spot.pricePerHour = dto.pricePerHour;
    if (dto.pricePerHourByVehicleType !== undefined) {
      spot.pricePerHourByVehicleType = dto.pricePerHourByVehicleType;
      // Sólo uno de los dos manda a la vez -- pasar a precio por vehículo
      // deja el precio único obsoleto, igual que create() lo hace desde el
      // arranque. Volver a un único precio (mandando `null` acá) no lo
      // reactiva solo: el dueño tiene que volver a cargar pricePerHour en
      // el mismo o en otro request, si no validateHourlyCoherence lo pide.
      if (dto.pricePerHourByVehicleType) spot.pricePerHour = null;
    }
    if (dto.title !== undefined) spot.title = dto.title;
    if (dto.description !== undefined) spot.description = dto.description;
    if (dto.covered !== undefined) spot.covered = dto.covered;
    if (dto.vehicleTypes !== undefined) spot.vehicleTypes = dto.vehicleTypes;
    if (dto.capacity !== undefined) spot.capacity = dto.capacity;

    if (dto.stayEnabled !== undefined) spot.stayEnabled = dto.stayEnabled;
    if (dto.pricePerDay !== undefined) spot.pricePerDay = dto.pricePerDay;
    if (dto.pricePerWeek !== undefined) spot.pricePerWeek = dto.pricePerWeek;
    if (dto.pricePerMonth !== undefined) spot.pricePerMonth = dto.pricePerMonth;
    if (dto.maxStayDays !== undefined) spot.maxStayDays = dto.maxStayDays;
    if (dto.stayAvailableFrom !== undefined) spot.stayAvailableFrom = dto.stayAvailableFrom;
    if (dto.stayAvailableUntil !== undefined) spot.stayAvailableUntil = dto.stayAvailableUntil;
    // A diferencia de create() (donde el DTO ya exige las 4 juntas vía
    // @ValidateIf), acá cada campo llega independiente en un PATCH parcial --
    // se valida contra el estado final ya mergeado, no contra lo que vino en
    // este request puntual, porque "habilitar" y "cargar las tarifas" pueden
    // ser dos requests distintos.
    if (!spot.hourlyEnabled && !spot.stayEnabled) {
      throw new BadRequestException('La cochera tiene que ofrecer alquiler por hora, por estadía, o ambos.');
    }
    if (spot.hourlyEnabled) this.validateHourlyCoherence(spot);
    if (spot.stayEnabled) this.validateStayCoherence(spot);

    const changingLocation = dto.address !== undefined || dto.lat !== undefined || dto.lng !== undefined;
    if (changingLocation) {
      if (dto.address === undefined || dto.lat === undefined || dto.lng === undefined) {
        throw new BadRequestException('address, lat and lng must all be provided together to change the location.');
      }
      spot.address = dto.address;
      // El título se genera de la dirección al crear la cochera (ver
      // create(), que recibe dto.title ya derivado por mobile) -- si cambia
      // la ubicación, el título tiene que seguirla o queda desactualizado.
      spot.title = dto.address.split(',')[0]?.trim() || dto.address;
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

  // Sólo se llama cuando stayEnabled termina en true (create() ya lo exige
  // vía DTO; update() lo re-chequea acá porque un PATCH parcial puede activar
  // el toggle sin traer las tarifas en el mismo request). Backstop en código
  // de la misma regla que el CHECK chk_parking_spots_stay_fields agrega en
  // la DB -- ver SchemaBootstrapService.
  private validateStayCoherence(spot: ParkingSpot): void {
    if (
      spot.pricePerDay === null ||
      spot.pricePerWeek === null ||
      spot.pricePerMonth === null ||
      spot.maxStayDays === null
    ) {
      throw new BadRequestException(
        'Para habilitar la estadía hay que cargar pricePerDay, pricePerWeek, pricePerMonth y maxStayDays.',
      );
    }
    if (
      spot.stayAvailableFrom !== null &&
      spot.stayAvailableUntil !== null &&
      spot.stayAvailableUntil < spot.stayAvailableFrom
    ) {
      throw new BadRequestException('stayAvailableUntil no puede ser anterior a stayAvailableFrom.');
    }
  }

  // Misma idea que validateStayCoherence, reforzada por el CHECK
  // chk_parking_spots_hourly_fields que agrega SchemaBootstrapService (que
  // sólo puede validar pricePerHour -- lo de pricePerHourByVehicleType, al
  // ser JSONB de forma libre, se queda enteramente acá).
  private validateHourlyCoherence(spot: ParkingSpot): void {
    if (spot.pricePerHourByVehicleType) {
      const byVehicle = spot.pricePerHourByVehicleType;
      for (const key of Object.keys(byVehicle)) {
        if (!VEHICLE_TYPES.includes(key as VehicleType)) {
          throw new BadRequestException(`Tipo de vehículo inválido en pricePerHourByVehicleType: ${key}`);
        }
      }
      for (const vehicleType of spot.vehicleTypes ?? []) {
        const price = byVehicle[vehicleType];
        if (typeof price !== 'number' || !(price > 0)) {
          throw new BadRequestException(
            `Falta cargar pricePerHourByVehicleType.${vehicleType} (o no es un número positivo).`,
          );
        }
      }
      return;
    }
    if (spot.pricePerHour === null) {
      throw new BadRequestException(
        'Para habilitar el alquiler por hora hay que cargar pricePerHour, o un precio por tipo de vehículo.',
      );
    }
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

  // Pausar oculta la cochera de search() (deja de poder reservarse de
  // nuevo) sin tocar reservas ya hechas -- findById() sigue resolviéndola.
  // Reactivar es la misma operación al revés.
  async setStatus(id: string, ownerId: string, status: ParkingSpotStatus.ACTIVE | ParkingSpotStatus.PAUSED): Promise<ParkingSpotResponse> {
    const spot = await this.getOwnedSpot(id, ownerId);
    spot.status = status;
    await this.parkingSpotRepo.save(spot);
    return this.findById(id);
  }

  // Soft delete (mismo patrón que auth-service usa para cuentas): la fila
  // queda pero status pasa a DELETED, así que search/findById/findAllByOwner
  // dejan de mostrarla. Las fotos se limpian del array acá; el caller
  // (controller) es quien tiene el StorageService para borrar los objetos
  // de R2 -- por eso se devuelven las URLs antes de irse. Bloqueado si
  // quedan reservas programadas sin terminar (incluye PENDING_OWNER_APPROVAL,
  // ver get_active_bookings.go en booking-service).
  async remove(id: string, ownerId: string): Promise<string[]> {
    const spot = await this.getOwnedSpot(id, ownerId);

    const today = new Date().toISOString().slice(0, 10);
    const farFuture = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const activeBookings = await this.bookingClient.getActiveBookings(id, today, farFuture);
    if (activeBookings.length > 0) {
      throw new ConflictException('No se puede eliminar: hay reservas programadas que no finalizaron.');
    }

    const deletedPhotos = spot.photos ?? [];
    spot.status = ParkingSpotStatus.DELETED;
    spot.photos = [];
    await this.parkingSpotRepo.save(spot);
    return deletedPhotos;
  }

  // Hard delete, unlike remove() above -- called only when an owner closes
  // their account for good (see auth-service's delete_user /
  // app/utils/parking_client.py), never from a user-facing route. Rows are
  // actually gone, not just marked DELETED; schedules cascade at the DB
  // level (ParkingSpotSchedule's FK has onDelete: 'CASCADE'). Photo URLs are
  // returned so the caller (which owns StorageService) can clean up R2.
  async removeAllForOwner(ownerId: string): Promise<string[]> {
    const spots = await this.parkingSpotRepo.find({ where: { ownerId } });
    if (spots.length === 0) return [];
    await this.parkingSpotRepo.remove(spots);
    return spots.flatMap((spot) => spot.photos ?? []);
  }

  // includeDeleted is for the admin panel only (customer support needs to see the full
  // history of a user's spots, deleted ones included, marked as such) -- the owner's own
  // app never passes it: ACTIVE y PAUSED, no DELETED -- el dueño tiene que ver sus cocheras
  // pausadas acá para poder reactivarlas, pero una borrada ya no existe para él tampoco.
  async findAllByOwner(ownerId: string, includeDeleted = false): Promise<ParkingSpotResponse[]> {
    const query = selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
      .addSelect('ST_X(spot.location::geometry)', 'lng')
      .addSelect('ST_Y(spot.location::geometry)', 'lat')
      .where('spot.ownerId = :ownerId', { ownerId });
    if (!includeDeleted) {
      query.andWhere('spot.status != :deleted', { deleted: ParkingSpotStatus.DELETED });
    }
    const raw = await query.orderBy('spot.createdAt', 'DESC').getRawMany();

    const schedules = await this.scheduleForMany(raw.map((row) => row.id));
    const spots = raw.map((row) => toResponse(row, schedules.get(row.id) ?? []));
    await this.applyRatings(spots);
    return spots;
  }

  // Documentación de respaldo (no las fotos de marketing en `photos`) que un
  // admin va a revisar antes de aprobar la cochera -- ver
  // AdminParkingSpotsController.
  async addVerificationPhotos(id: string, ownerId: string, urls: string[]): Promise<ParkingSpotResponse> {
    const spot = await this.getOwnedSpot(id, ownerId);
    const current = spot.verificationPhotos ?? [];
    if (current.length + urls.length > MAX_VERIFICATION_PHOTOS) {
      throw new BadRequestException(`Podés subir hasta ${MAX_VERIFICATION_PHOTOS} fotos de documentación.`);
    }
    spot.verificationPhotos = [...current, ...urls];
    await this.parkingSpotRepo.save(spot);
    return this.findById(id);
  }

  // Cola de revisión del backoffice -- todas las cocheras que un admin todavía
  // no aprobó ni rechazó, más antiguas primero (FIFO).
  async findPendingReview(): Promise<ParkingSpotResponse[]> {
    const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
      .addSelect('ST_X(spot.location::geometry)', 'lng')
      .addSelect('ST_Y(spot.location::geometry)', 'lat')
      .where('spot.status = :status', { status: ParkingSpotStatus.PENDING_REVIEW })
      .orderBy('spot.createdAt', 'ASC')
      .getRawMany();

    const schedules = await this.scheduleForMany(raw.map((row) => row.id));
    return raw.map((row) => toResponse(row, schedules.get(row.id) ?? []));
  }

  // Decisión del admin: aprobar la manda a ACTIVE (recién ahí aparece en
  // search()), rechazarla la deja en REJECTED con el motivo en reviewNotes.
  // Sólo se puede revisar una vez -- si ya se decidió, el dueño tiene que
  // crear la cochera de nuevo en vez de reabrir esta.
  async reviewSpot(id: string, decision: 'approved' | 'rejected', notes: string | null): Promise<ParkingSpotResponse> {
    const spot = await this.parkingSpotRepo.findOne({ where: { id } });
    if (!spot) throw new NotFoundException('Cochera no encontrada');
    if (spot.status !== ParkingSpotStatus.PENDING_REVIEW) {
      throw new ConflictException('Esta cochera no está pendiente de revisión.');
    }
    spot.status = decision === 'approved' ? ParkingSpotStatus.ACTIVE : ParkingSpotStatus.REJECTED;
    spot.reviewNotes = notes ?? null;
    await this.parkingSpotRepo.save(spot);
    return this.findById(id);
  }
}
