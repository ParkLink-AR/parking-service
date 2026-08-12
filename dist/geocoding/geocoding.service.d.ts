import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export interface GeocodingResult {
    lat: number;
    lng: number;
    displayName: string;
}
export declare class GeocodingService {
    private readonly httpService;
    private readonly configService;
    constructor(httpService: HttpService, configService: ConfigService);
    geocodeAddress(address: string): Promise<GeocodingResult>;
}
