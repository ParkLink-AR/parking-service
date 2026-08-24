import { ParkingSpotsService } from './parking-spots.service';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { AvailabilityService } from '../availability/availability.service';
import { AvailabilityQueryDto } from '../availability/dto/availability-query.dto';
export declare class ParkingSpotsController {
    private readonly parkingSpotsService;
    private readonly availabilityService;
    constructor(parkingSpotsService: ParkingSpotsService, availabilityService: AvailabilityService);
    search(filters: SearchParkingSpotDto): Promise<import("./parking-spots.service").ParkingSpotResponse[]>;
    findById(id: string): Promise<import("./parking-spots.service").ParkingSpotResponse>;
    getAvailability(id: string, query: AvailabilityQueryDto): Promise<{
        days: import("../availability/availability.service").DayAvailabilityResponse[];
    }>;
    create(dto: CreateParkingSpotDto, ownerId?: string): Promise<import("./parking-spots.service").ParkingSpotResponse>;
    findAllByOwner(id: string): Promise<import("./parking-spots.service").ParkingSpotResponse[]>;
}
