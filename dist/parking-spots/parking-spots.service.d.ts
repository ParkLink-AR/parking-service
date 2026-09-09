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
export declare const MAX_PHOTOS = 10;
export interface ParkingSpotResponse {
    id: string;
    ownerId: string;
    title: string;
    description: string | null;
    address: string;
    lat: number;
    lng: number;
    hourlyEnabled: boolean;
    pricePerHour: number | null;
    stayEnabled: boolean;
    pricePerDay: number | null;
    pricePerWeek: number | null;
    pricePerMonth: number | null;
    stayAvailableFrom: string | null;
    maxStayDays: number | null;
    covered: boolean;
    instantBooking: boolean;
    capacity: number;
    schedule: ScheduleEntryResponse[];
    photos: string[];
    rules: string[];
    status: ParkingSpotStatus;
    createdAt: Date;
    updatedAt: Date;
    distanceMeters?: number;
    rating: number;
    reviewCount: number;
}
export declare class ParkingSpotsService {
    private readonly parkingSpotRepo;
    private readonly scheduleRepo;
    private readonly bookingClient;
    private readonly logger;
    constructor(parkingSpotRepo: Repository<ParkingSpot>, scheduleRepo: Repository<ParkingSpotSchedule>, bookingClient: BookingClientService);
    private scheduleFor;
    private scheduleForMany;
    private applyRatings;
    search(filters: SearchParkingSpotDto): Promise<ParkingSpotResponse[]>;
    findById(id: string): Promise<ParkingSpotResponse>;
    create(dto: CreateParkingSpotDto, ownerId: string): Promise<ParkingSpotResponse>;
    update(id: string, dto: UpdateParkingSpotDto): Promise<ParkingSpotResponse>;
    private replaceSchedule;
    private validateStayCoherence;
    private validateHourlyCoherence;
    private getOwnedSpot;
    addPhotos(id: string, ownerId: string, urls: string[]): Promise<ParkingSpotResponse>;
    removePhoto(id: string, ownerId: string, url: string): Promise<ParkingSpotResponse>;
    reorderPhotos(id: string, ownerId: string, orderedUrls: string[]): Promise<ParkingSpotResponse>;
    setStatus(id: string, ownerId: string, status: ParkingSpotStatus.ACTIVE | ParkingSpotStatus.PAUSED): Promise<ParkingSpotResponse>;
    remove(id: string, ownerId: string): Promise<string[]>;
    removeAllForOwner(ownerId: string): Promise<string[]>;
    findAllByOwner(ownerId: string): Promise<ParkingSpotResponse[]>;
}
