import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

@Injectable()
export class GeocodingService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Convierte una dirección en texto libre a coordenadas lat/lng usando Nominatim (OSM).
   * Documentación: https://nominatim.org/release-docs/latest/api/Search/
   */
  async geocodeAddress(address: string): Promise<GeocodingResult> {
    const baseUrl = this.configService.get<string>('NOMINATIM_BASE_URL');
    const userAgent = this.configService.get<string>('NOMINATIM_USER_AGENT');

    const { data } = await firstValueFrom(
      this.httpService.get(`${baseUrl}/search`, {
        params: {
          q: address,
          format: 'json',
          limit: 1,
        },
        headers: {
          // Nominatim requiere un User-Agent identificable; sin esto puede rechazar requests
          'User-Agent': userAgent,
        },
      }),
    );

    if (!data || data.length === 0) {
      throw new BadRequestException(
        'No se pudo geocodificar la dirección provista. Verificá que sea válida.',
      );
    }

    const result = data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    };
  }
}
