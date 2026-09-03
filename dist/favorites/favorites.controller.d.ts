import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
export declare class FavoritesController {
    private readonly favoritesService;
    constructor(favoritesService: FavoritesService);
    private requireUserId;
    listSpots(userId?: string): Promise<import("../parking-spots/parking-spots.service").ParkingSpotResponse[]>;
    listIds(userId?: string): Promise<string[]>;
    add(dto: AddFavoriteDto, userId?: string): Promise<{
        favorited: boolean;
    }>;
    remove(parkingSpotId: string, userId?: string): Promise<{
        favorited: boolean;
    }>;
}
