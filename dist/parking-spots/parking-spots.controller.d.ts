import { ParkingSpotsService } from './parking-spots.service';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DeletePhotoDto } from './dto/delete-photo.dto';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import { ParkingSpotsBatchQueryDto } from './dto/parking-spots-batch-query.dto';
import { AvailabilityService } from '../availability/availability.service';
import { AvailabilityQueryDto } from '../availability/dto/availability-query.dto';
import { StorageService } from '../storage/storage.service';
export declare class ParkingSpotsController {
    private readonly parkingSpotsService;
    private readonly availabilityService;
    private readonly storageService;
    constructor(parkingSpotsService: ParkingSpotsService, availabilityService: AvailabilityService, storageService: StorageService);
    private requireUserId;
    search(filters: SearchParkingSpotDto): Promise<import("./parking-spots.service").ParkingSpotResponse[]>;
    findByIds(query: ParkingSpotsBatchQueryDto): Promise<import("./parking-spots.service").ParkingSpotResponse[]>;
    findById(id: string): Promise<import("./parking-spots.service").ParkingSpotResponse>;
    getAvailability(id: string, query: AvailabilityQueryDto): Promise<{
        days: import("../availability/availability.service").DayAvailabilityResponse[];
    }>;
    create(dto: CreateParkingSpotDto, ownerId?: string): Promise<import("./parking-spots.service").ParkingSpotResponse>;
    update(id: string, dto: UpdateParkingSpotDto, _userId?: string): Promise<import("./parking-spots.service").ParkingSpotResponse>;
    findAllByOwner(id: string): Promise<import("./parking-spots.service").ParkingSpotResponse[]>;
    setStatus(id: string, dto: UpdateStatusDto, userId?: string): Promise<import("./parking-spots.service").ParkingSpotResponse>;
    uploadPhotos(id: string, files: Array<Express.Multer.File>, userId?: string): Promise<import("./parking-spots.service").ParkingSpotResponse>;
    getPhotos(id: string): Promise<{
        photos: string[];
    }>;
    deletePhoto(id: string, dto: DeletePhotoDto, userId?: string): Promise<import("./parking-spots.service").ParkingSpotResponse>;
    reorderPhotos(id: string, dto: ReorderPhotosDto, userId?: string): Promise<import("./parking-spots.service").ParkingSpotResponse>;
    remove(id: string, userId?: string): Promise<{
        message: string;
    }>;
    removeAllForOwner(ownerId: string): Promise<{
        message: string;
    }>;
}
