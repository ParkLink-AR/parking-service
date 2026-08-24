import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TimeWindow } from '../availability/interval-math';
export declare class BookingClientService {
    private readonly httpService;
    private readonly configService;
    constructor(httpService: HttpService, configService: ConfigService);
    getActiveBookings(parkingSpotId: string, from: string, to: string): Promise<TimeWindow[]>;
}
