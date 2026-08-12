import { Repository } from 'typeorm';
import { ParkingSpot } from './entities/parking-spot.entity';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { GeocodingService } from '../geocoding/geocoding.service';
export declare class ParkingSpotsService {
    private readonly parkingSpotRepo;
    private readonly geocodingService;
    constructor(parkingSpotRepo: Repository<ParkingSpot>, geocodingService: GeocodingService);
    search(filters: SearchParkingSpotDto): Promise<ParkingSpot[]>;
    findById(id: string): Promise<ParkingSpot>;
    create(dto: CreateParkingSpotDto, ownerId: string): Promise<ParkingSpot>;
    findAllByOwner(ownerId: string): Promise<ParkingSpot[]>;
}
