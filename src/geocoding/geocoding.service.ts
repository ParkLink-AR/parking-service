import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface GeocodingCandidate extends GeocodingResult {
  city?: string;
  postcode?: string;
}

// Muchísimos nombres de calle se repiten en un montón de ciudades argentinas
// distintas ("San Martín", "Rivadavia", "Belgrano", "Corrientes"...) -- sin
// ninguna pista de dónde buscar, Nominatim devuelve como primer resultado la
// que sea más "importante" en su ranking global, que en la práctica termina
// siendo cualquier ciudad del país (probado: "San Martín 500" sin esto
// resuelve a Bariloche; "Rivadavia 2000", a Posadas). countrycodes acota a
// Argentina; el viewbox (sin bounded=1, así no descarta nada fuera de él)
// hace de desempate a favor de CABA/GBA, que es donde opera ParkLink hoy.
// Igual puede haber ambigüedad dentro de esa zona -- ver searchAddress().
const NOMINATIM_COUNTRY_CODE = 'ar';
const BUENOS_AIRES_VIEWBOX = '-58.53,-34.53,-58.33,-34.70'; // lon1,lat1,lon2,lat2
const SEARCH_RESULTS_LIMIT = 5;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

// Nominatim's own display_name is a raw, unordered dump of OSM's address
// hierarchy (house number first, neighborhood/comuna clutter, inconsistent
// ordering) -- e.g. "1980, Juncal, Barrio Norte, Recoleta, Buenos Aires,
// Comuna 2, Ciudad Autónoma de Buenos Aires, 1113, Argentina". Rebuilt into
// "calle número, ciudad, provincia, cp, país" instead, which is what
// candidates actually show the user.
function formatAddress(address: NominatimResult['address']): string {
  const street = [address?.road, address?.house_number].filter(Boolean).join(' ');
  const city = address?.city ?? address?.town ?? address?.village ?? address?.municipality;
  return [street, city, address?.state, address?.postcode, address?.country]
    .filter(Boolean)
    .join(', ');
}

@Injectable()
export class GeocodingService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Busca hasta `limit` coincidencias para una dirección en texto libre vía
   * Nominatim (OSM), de más a menos relevante -- para direcciones ambiguas
   * (mismo nombre de calle en varias ciudades) el llamador (mobile) le
   * muestra la lista al usuario para que elija la correcta, en vez de que
   * el back adivine una sola.
   * Documentación: https://nominatim.org/release-docs/latest/api/Search/
   */
  async searchAddress(query: string, limit = SEARCH_RESULTS_LIMIT): Promise<GeocodingCandidate[]> {
    const baseUrl = this.configService.get<string>('NOMINATIM_BASE_URL');
    const userAgent = this.configService.get<string>('NOMINATIM_USER_AGENT');

    const { data } = await firstValueFrom(
      this.httpService.get<NominatimResult[]>(`${baseUrl}/search`, {
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
          // Nominatim requiere un User-Agent identificable; sin esto puede rechazar requests
          'User-Agent': userAgent,
        },
      }),
    );

    return (data ?? []).map((result) => ({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: formatAddress(result.address) || result.display_name,
      city:
        result.address?.city ??
        result.address?.town ??
        result.address?.village ??
        result.address?.municipality,
      postcode: result.address?.postcode,
    }));
  }

  /**
   * El camino inverso: coordenadas (típicamente el GPS del dispositivo) a
   * una dirección legible -- usado cuando el dueño publica una cochera con
   * "usar mi ubicación actual" en vez de tipear una dirección, así la
   * cochera igual queda con una etiqueta de texto guardada, no sólo lat/lng.
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    const baseUrl = this.configService.get<string>('NOMINATIM_BASE_URL');
    const userAgent = this.configService.get<string>('NOMINATIM_USER_AGENT');

    const { data } = await firstValueFrom(
      this.httpService.get<NominatimResult>(`${baseUrl}/reverse`, {
        params: { lat, lon: lng, format: 'json', addressdetails: 1 },
        headers: {
          'User-Agent': userAgent,
        },
      }),
    );

    if (!data || !data.address) {
      throw new BadRequestException('No se pudo determinar la dirección de esa ubicación.');
    }

    return {
      lat,
      lng,
      displayName: formatAddress(data.address) || data.display_name,
    };
  }
}
