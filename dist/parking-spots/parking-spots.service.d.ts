import { Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from './entities/parking-spot.entity';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { GeocodingService } from '../geocoding/geocoding.service';
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
export declare class ParkingSpotsService {
    private readonly parkingSpotRepo;
    private readonly geocodingService;
    constructor(parkingSpotRepo: Repository<ParkingSpot>, geocodingService: GeocodingService);
    search(filters: SearchParkingSpotDto): Promise<ParkingSpotResponse[]>;
    findById(id: string): Promise<ParkingSpotResponse>;
    create(dto: CreateParkingSpotDto, ownerId: string): Promise<ParkingSpotResponse>;
    findAllByOwner(ownerId: string): Promise<ParkingSpotResponse[]>;
}
