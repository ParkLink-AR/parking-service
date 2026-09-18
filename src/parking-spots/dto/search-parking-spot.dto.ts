import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsISO8601, IsLatitude, IsLongitude, IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

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

  // Ventana horaria deseada (ISO 8601 con offset, ej. "2026-08-24T08:00:00-03:00").
  // Van juntos: si viene uno tiene que venir el otro (mismo criterio que
  // address/lat/lng en UpdateParkingSpotDto). ParkingSpotsService.search()
  // los usa para filtrar por disponibilidad real vía booking-service (ver
  // BookingClientService.getBookableSpotIds).
  @ValidateIf((dto: SearchParkingSpotDto) => dto.from !== undefined || dto.to !== undefined)
  @IsISO8601()
  from?: string;

  @ValidateIf((dto: SearchParkingSpotDto) => dto.from !== undefined || dto.to !== undefined)
  @IsISO8601()
  to?: string;
}
