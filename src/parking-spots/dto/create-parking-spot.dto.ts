import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ScheduleEntryDto } from './schedule-entry.dto';

export class CreateParkingSpotDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Etiqueta en texto libre para mostrar -- mobile ya resolvió lat/lng antes
  // de mandar esto (vía GET /geocode si el dueño tipeó una dirección, o el
  // GPS del dispositivo si usó su ubicación actual), así que el back no
  // geocodifica esto, sólo lo guarda para mostrarlo.
  @IsString()
  address!: string;

  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;

  @IsNumber()
  @Min(0)
  pricePerHour!: number;

  @IsOptional()
  @IsBoolean()
  covered?: boolean;

  // Lugares idénticos que alquila esta cochera contra el mismo id (playa de
  // estacionamiento). Omitido = 1 (cochera común).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  capacity?: number;

  @IsOptional()
  @IsBoolean()
  instantBooking?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryDto)
  schedule?: ScheduleEntryDto[];

  @IsOptional()
  @IsArray()
  rules?: string[];

  // "Estadía": alquiler por día/semana/mes en vez de por hora -- ver el
  // comentario en ParkingSpot.stayEnabled. Default false: una cochera nueva
  // no ofrece estadía hasta que el dueño la habilite explícitamente.
  @IsOptional()
  @IsBoolean()
  stayEnabled?: boolean;

  // Las tres tarifas y la duración máxima son obligatorias apenas
  // stayEnabled=true (no tiene sentido "habilitar estadía" sin decir cuánto
  // sale ni hasta cuándo) -- @ValidateIf las salta por completo si
  // stayEnabled es false/omitido, así una cochera común no tiene que mandar
  // ninguno de estos campos.
  @ValidateIf((dto: CreateParkingSpotDto) => dto.stayEnabled === true)
  @IsNumber()
  @Min(0.01)
  pricePerDay?: number;

  @ValidateIf((dto: CreateParkingSpotDto) => dto.stayEnabled === true)
  @IsNumber()
  @Min(0.01)
  pricePerWeek?: number;

  @ValidateIf((dto: CreateParkingSpotDto) => dto.stayEnabled === true)
  @IsNumber()
  @Min(0.01)
  pricePerMonth?: number;

  @ValidateIf((dto: CreateParkingSpotDto) => dto.stayEnabled === true)
  @IsInt()
  @Min(1)
  maxStayDays?: number;

  // Fecha (YYYY-MM-DD) desde la que se acepta el check-in de una estadía. A
  // diferencia de las tarifas y la duración máxima, es opcional aun con
  // stayEnabled=true -- si no viene, StaysService la trata como "desde hoy".
  @IsOptional()
  @IsISO8601({ strict: true })
  stayAvailableFrom?: string;
}
