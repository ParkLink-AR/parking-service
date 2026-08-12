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
let GeocodingService = class GeocodingService {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
    }
    async geocodeAddress(address) {
        const baseUrl = this.configService.get('NOMINATIM_BASE_URL');
        const userAgent = this.configService.get('NOMINATIM_USER_AGENT');
        const { data } = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${baseUrl}/search`, {
            params: {
                q: address,
                format: 'json',
                limit: 1,
            },
            headers: {
                'User-Agent': userAgent,
            },
        }));
        if (!data || data.length === 0) {
            throw new common_1.BadRequestException('No se pudo geocodificar la dirección provista. Verificá que sea válida.');
        }
        const result = data[0];
        return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            displayName: result.display_name,
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