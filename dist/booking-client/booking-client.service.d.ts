import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TimeWindow } from '../availability/interval-math';
export interface SpotRating {
    rating: number;
    reviewCount: number;
}
export interface SpotCapacity {
    id: string;
    capacity: number;
}
export declare class BookingClientService {
    private readonly httpService;
    private readonly configService;
    constructor(httpService: HttpService, configService: ConfigService);
    getActiveBookings(parkingSpotId: string, from: string, to: string): Promise<TimeWindow[]>;
    getBookableSpotIds(spots: SpotCapacity[], start: string, end: string): Promise<string[]>;
    getRatings(parkingSpotIds: string[]): Promise<Record<string, SpotRating>>;
}
