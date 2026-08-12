import { ParkingSpotsService } from './parking-spots.service';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
export declare class ParkingSpotsController {
    private readonly parkingSpotsService;
    constructor(parkingSpotsService: ParkingSpotsService);
    search(filters: SearchParkingSpotDto): Promise<import("./entities/parking-spot.entity").ParkingSpot[]>;
    findById(id: string): Promise<import("./entities/parking-spot.entity").ParkingSpot>;
    create(dto: CreateParkingSpotDto): Promise<import("./entities/parking-spot.entity").ParkingSpot>;
    findAllByOwner(id: string): Promise<import("./entities/parking-spot.entity").ParkingSpot[]>;
}
