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
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
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

  // Se puede subir o bajar sin restricción. Bajarla por debajo de las
  // reservas activas no las cancela; sólo impide crear nuevas hasta que se
  // libere lugar.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  capacity?: number;

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

  // "Estadía" -- ver el comentario en ParkingSpot.stayEnabled y en
  // CreateParkingSpotDto. A diferencia de la creación, acá cada campo es
  // independientemente opcional (es un PATCH parcial: un dueño puede querer
  // sólo subir pricePerMonth sin retocar el resto) -- la coherencia
  // "si stayEnabled=true, las tarifas y maxStayDays tienen que existir" se
  // valida en ParkingSpotsService.update() contra el estado ya mergeado,
  // no acá contra el payload aislado.
  @IsOptional()
  @IsBoolean()
  stayEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  pricePerDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  pricePerWeek?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  pricePerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStayDays?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  stayAvailableFrom?: string;
}
