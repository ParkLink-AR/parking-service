import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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
}
