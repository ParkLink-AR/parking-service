import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from './entities/parking-spot.entity';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { GeocodingService } from '../geocoding/geocoding.service';

@Injectable()
export class ParkingSpotsService {
  constructor(
    @InjectRepository(ParkingSpot)
    private readonly parkingSpotRepo: Repository<ParkingSpot>,
    private readonly geocodingService: GeocodingService,
  ) {}

  /**
   * Búsqueda geoespacial usando ST_DWithin de PostGIS.
   * ST_DWithin compara la distancia real (en metros, gracias al tipo `geography`)
   * entre la cochera y el punto de búsqueda, sin necesidad de llamar a ninguna API externa.
   */
  async search(filters: SearchParkingSpotDto): Promise<ParkingSpot[]> {
    const query = this.parkingSpotRepo
      .createQueryBuilder('spot')
      .where('spot.status = :status', { status: ParkingSpotStatus.ACTIVE })
      .andWhere(
        `ST_DWithin(
          spot.location,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :radius
        )`,
        { lat: filters.lat, lng: filters.lng, radius: filters.radius },
      );

    if (filters.maxPrice !== undefined) {
      query.andWhere('spot.pricePerHour <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    return query.getMany();
  }

  async findById(id: string): Promise<ParkingSpot> {
    const spot = await this.parkingSpotRepo.findOne({
      where: { id, status: ParkingSpotStatus.ACTIVE },
    });

    if (!spot) {
      throw new NotFoundException('Cochera no encontrada');
    }

    return spot;
  }

  /**
   * Crea una cochera geocodificando la dirección provista antes de guardar.
   */
  async create(dto: CreateParkingSpotDto, ownerId: string): Promise<ParkingSpot> {
    const geocoded = await this.geocodingService.geocodeAddress(dto.address);

    const spot = this.parkingSpotRepo.create({
      title: dto.title,
      description: dto.description,
      address: dto.address,
      pricePerHour: dto.pricePerHour,
      rules: dto.rules ?? [],
      ownerId,
      // GeoJSON format: TypeORM/PostGIS espera { type: 'Point', coordinates: [lng, lat] }
      location: {
        type: 'Point',
        coordinates: [geocoded.lng, geocoded.lat],
      },
    });

    return this.parkingSpotRepo.save(spot);
  }

  async findAllByOwner(ownerId: string): Promise<ParkingSpot[]> {
    return this.parkingSpotRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
  }
}
