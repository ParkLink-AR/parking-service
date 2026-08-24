import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export interface GeocodingResult {
    lat: number;
    lng: number;
    displayName: string;
}
export interface GeocodingCandidate extends GeocodingResult {
    city?: string;
    postcode?: string;
}
export declare class GeocodingService {
    private readonly httpService;
    private readonly configService;
    constructor(httpService: HttpService, configService: ConfigService);
    searchAddress(query: string, limit?: number): Promise<GeocodingCandidate[]>;
    reverseGeocode(lat: number, lng: number): Promise<GeocodingResult>;
}
