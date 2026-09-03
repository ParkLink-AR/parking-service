import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { ParkingSpotResponse, ParkingSpotsService } from '../parking-spots/parking-spots.service';
export declare class FavoritesService {
    private readonly favoriteRepo;
    private readonly parkingSpotsService;
    constructor(favoriteRepo: Repository<Favorite>, parkingSpotsService: ParkingSpotsService);
    add(userId: string, parkingSpotId: string): Promise<void>;
    remove(userId: string, parkingSpotId: string): Promise<void>;
    listIds(userId: string): Promise<string[]>;
    listSpots(userId: string): Promise<ParkingSpotResponse[]>;
}
