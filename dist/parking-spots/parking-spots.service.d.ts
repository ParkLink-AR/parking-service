import { Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from './entities/parking-spot.entity';
import { ParkingSpotSchedule } from './entities/parking-spot-schedule.entity';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { BookingClientService } from '../booking-client/booking-client.service';
export interface ScheduleEntryResponse {
    dayOfWeek: number;
    startHour: number;
    endHour: number;
}
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
export declare class ParkingSpotsService {
    private readonly parkingSpotRepo;
    private readonly scheduleRepo;
    private readonly bookingClient;
    private readonly logger;
    constructor(parkingSpotRepo: Repository<ParkingSpot>, scheduleRepo: Repository<ParkingSpotSchedule>, bookingClient: BookingClientService);
    private scheduleFor;
    private scheduleForMany;
    search(filters: SearchParkingSpotDto): Promise<ParkingSpotResponse[]>;
    findById(id: string): Promise<ParkingSpotResponse>;
    create(dto: CreateParkingSpotDto, ownerId: string): Promise<ParkingSpotResponse>;
    update(id: string, dto: UpdateParkingSpotDto): Promise<ParkingSpotResponse>;
    private replaceSchedule;
    findByIds(ids: string[]): Promise<ParkingSpotResponse[]>;
    findAllByOwner(ownerId: string): Promise<ParkingSpotResponse[]>;
}
