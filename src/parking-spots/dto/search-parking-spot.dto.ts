import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsIn, IsISO8601, IsLatitude, IsLongitude, IsNumber, IsOptional, Matches, Max, Min, ValidateIf,
} from 'class-validator';
import { SEARCH_SORTS, SearchSort } from '../search-sort';
import { VEHICLE_TYPES, VehicleType } from '../vehicle-type';

const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SearchParkingSpotDto {
  // Mobile always resolves a free-text search to coordinates first (via
  // GET /geocode, which shows the user every ambiguous match instead of
  // guessing one) before calling this -- so search itself only ever deals
  // in coordinates, never raw address strings.
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  // Radio de búsqueda en metros. Opcional: si no se especifica, se devuelven
  // todas las cocheras activas ordenadas por distancia (comportamiento
  // "marketplace" para la primera apertura de la app).
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radius?: number;

  // Price range, in the owner's own rates (mobile takes the commission out of what the driver
  // typed): per hour, or per day when looking for stays (stayOnly or stayFrom/stayTo), and
  // for the driver's vehicle when vehicleType is given -- see search-filters.withinPriceRange.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // Only spots that take this kind of vehicle; prices are then compared at its own rate.
  @IsOptional()
  @IsIn(VEHICLE_TYPES)
  vehicleType?: VehicleType;

  // Only spots rated at least this many stars on average (from at least one review).
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  // A stay: check-in and check-out days (YYYY-MM-DD, Buenos Aires). Go together. Only spots
  // that take that stay and have room for it the whole time -- see search-filters.acceptsStay.
  @ValidateIf((dto: SearchParkingSpotDto) => dto.stayFrom !== undefined || dto.stayTo !== undefined)
  @Matches(PLAIN_DATE)
  stayFrom?: string;

  @ValidateIf((dto: SearchParkingSpotDto) => dto.stayFrom !== undefined || dto.stayTo !== undefined)
  @Matches(PLAIN_DATE)
  stayTo?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  covered?: boolean;

  // Sólo cocheras con la opción de estadía habilitada (ver
  // ParkingSpot.stayEnabled) -- lo usa el buscador cuando el conductor busca
  // específicamente un lugar para dejar el auto varios días/semanas/meses,
  // no una franja horaria.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  stayOnly?: boolean;

  // Sólo cocheras con alquiler por hora habilitado -- contraparte de
  // stayOnly, para cuando el conductor quiere específicamente una franja
  // horaria y no le interesan las que sólo ofrecen estadía. Ninguno de los
  // dos excluye al otro a nivel DTO (una cochera puede ofrecer ambos y
  // pasar los dos filtros a la vez); es mobile quien los usa como
  // mutuamente excluyentes en su UI.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hourlyOnly?: boolean;

  // Sólo cocheras que ofrecen media estadía (12 h). Con from, el bloque es [from, from + 12 h)
  // (to se ignora) y tiene que caber según las reglas de la media estadía, no las horarias
  // -- ver stays/half-day.ts. Los precios pasan a ser los del bloque.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  halfDayOnly?: boolean;

  // Ventana horaria deseada (ISO 8601 con offset, ej. "2026-08-24T08:00:00-03:00").
  // Van juntos: si viene uno tiene que venir el otro (mismo criterio que
  // address/lat/lng en UpdateParkingSpotDto). ParkingSpotsService.search()
  // los usa para filtrar por disponibilidad real: alquiler por hora habilitado, abierta
  // toda la franja según su horario semanal, sin días cerrados y con lugar libre según
  // booking-service (ver search-filters.openForHourly y BookingClientService.getBookableSpotIds).
  @ValidateIf((dto: SearchParkingSpotDto) => dto.from !== undefined || dto.to !== undefined)
  @IsISO8601()
  from?: string;

  @ValidateIf((dto: SearchParkingSpotDto) => dto.from !== undefined || dto.to !== undefined)
  @IsISO8601()
  to?: string;

  // Cómo ordenar los resultados: 'distance' (por defecto), 'price' o 'rating' -- ver search-sort.ts.
  @IsOptional()
  @IsIn(SEARCH_SORTS)
  sort?: SearchSort;
}
