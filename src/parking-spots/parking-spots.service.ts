import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from './entities/parking-spot.entity';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';

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
  scheduleText: string | null;
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
  ['spot.scheduleText', 'scheduleText'],
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

function toResponse(raw: Record<string, any>, distanceMeters?: number): ParkingSpotResponse {
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

@Injectable()
export class ParkingSpotsService {
  constructor(
    @InjectRepository(ParkingSpot)
    private readonly parkingSpotRepo: Repository<ParkingSpot>,
  ) {}

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
    return raw.map((row) => toResponse(row, parseFloat(row.distanceM)));
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

    return toResponse(raw);
  }

  /**
   * Crea una cochera en las coordenadas provistas -- el mobile ya las
   * resolvió antes de mandar esto (eligiendo una entre varias vía
   * GET /geocode si el dueño tipeó una dirección, o el GPS del dispositivo
   * si usó su ubicación actual), así que create() no vuelve a geocodificar.
   */
  async create(dto: CreateParkingSpotDto, ownerId: string): Promise<ParkingSpotResponse> {
    const spot = this.parkingSpotRepo.create({
      title: dto.title,
      description: dto.description,
      address: dto.address,
      pricePerHour: dto.pricePerHour,
      covered: dto.covered ?? false,
      scheduleText: dto.scheduleText ?? null,
      rules: dto.rules ?? [],
      ownerId,
      // GeoJSON format: TypeORM/PostGIS espera { type: 'Point', coordinates: [lng, lat] }
      location: {
        type: 'Point',
        coordinates: [dto.lng, dto.lat],
      },
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
    if (dto.scheduleText !== undefined) spot.scheduleText = dto.scheduleText;

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
    return this.findById(id);
  }

  async findAllByOwner(ownerId: string): Promise<ParkingSpotResponse[]> {
    const raw = await selectBaseColumns(this.parkingSpotRepo.createQueryBuilder('spot'))
      .addSelect('ST_X(spot.location::geometry)', 'lng')
      .addSelect('ST_Y(spot.location::geometry)', 'lat')
      .where('spot.ownerId = :ownerId', { ownerId })
      .orderBy('spot.createdAt', 'DESC')
      .getRawMany();

    return raw.map((row) => toResponse(row));
  }
}
