import { GeocodingService } from './geocoding.service';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
export declare class GeocodingController {
    private readonly geocodingService;
    constructor(geocodingService: GeocodingService);
    search(q?: string): Promise<import("./geocoding.service").GeocodingCandidate[]>;
    reverse({ lat, lng }: ReverseGeocodeDto): Promise<import("./geocoding.service").GeocodingResult>;
}
