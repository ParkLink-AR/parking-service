import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ScheduleEntryDto } from './schedule-entry.dto';

export class UpdateParkingSpotDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @IsOptional()
  @IsBoolean()
  covered?: boolean;

  @IsOptional()
  @IsBoolean()
  instantBooking?: boolean;

  // Reemplazo completo del horario semanal (no un patch incremental por
  // día) -- ver ParkingSpotsService.replaceSchedule.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryDto)
  schedule?: ScheduleEntryDto[];

  // Cambiar la ubicación: igual que al publicar, mobile ya resolvió estas
  // coordenadas (vía GET /geocode o el GPS) antes de mandar esto. Los tres
  // campos van juntos -- si viene uno de address/lat/lng tienen que venir
  // los tres (ver ParkingSpotsService.update).
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;
}
