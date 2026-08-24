"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeocodingService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const NOMINATIM_COUNTRY_CODE = 'ar';
const BUENOS_AIRES_VIEWBOX = '-58.53,-34.53,-58.33,-34.70';
const SEARCH_RESULTS_LIMIT = 5;
function formatAddress(address) {
    const street = [address?.road, address?.house_number].filter(Boolean).join(' ');
    const city = address?.city ?? address?.town ?? address?.village ?? address?.municipality;
    return [street, city, address?.state, address?.postcode, address?.country]
        .filter(Boolean)
        .join(', ');
}
let GeocodingService = class GeocodingService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
    }
    async searchAddress(query, limit = SEARCH_RESULTS_LIMIT) {
        const baseUrl = this.configService.get('NOMINATIM_BASE_URL');
        const userAgent = this.configService.get('NOMINATIM_USER_AGENT');
        const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${baseUrl}/search`, {
            params: {
                q: query,
                format: 'json',
                limit,
                addressdetails: 1,
                countrycodes: NOMINATIM_COUNTRY_CODE,
                viewbox: BUENOS_AIRES_VIEWBOX,
                bounded: 0,
            },
            headers: {
                'User-Agent': userAgent,
            },
        }));
        return (data ?? []).map((result) => ({
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            displayName: formatAddress(result.address) || result.display_name,
            city: result.address?.city ??
                result.address?.town ??
                result.address?.village ??
                result.address?.municipality,
            postcode: result.address?.postcode,
        }));
    }
    async reverseGeocode(lat, lng) {
        const baseUrl = this.configService.get('NOMINATIM_BASE_URL');
        const userAgent = this.configService.get('NOMINATIM_USER_AGENT');
        const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${baseUrl}/reverse`, {
            params: { lat, lon: lng, format: 'json', addressdetails: 1 },
            headers: {
                'User-Agent': userAgent,
            },
        }));
        if (!data || !data.address) {
            throw new common_1.BadRequestException('No se pudo determinar la dirección de esa ubicación.');
        }
        return {
            lat,
            lng,
            displayName: formatAddress(data.address) || data.display_name,
        };
    }
};
exports.GeocodingService = GeocodingService;
exports.GeocodingService = GeocodingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], GeocodingService);
//# sourceMappingURL=geocoding.service.js.map