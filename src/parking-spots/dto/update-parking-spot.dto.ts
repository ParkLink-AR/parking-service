import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScheduleEntryDto } from './schedule-entry.dto';
import { ACCESS_INSTRUCTIONS_MAX_LENGTH } from './set-blocked-dates.dto';
import { normalizeSpotTitle, SPOT_TITLE_MAX_LENGTH } from '../spot-title';
import { StayRates, VehicleType, VEHICLE_TYPES } from '../vehicle-type';

export class UpdateParkingSpotDto {
  @IsOptional()
  @Transform(normalizeSpotTitle)
  @IsString()
  @IsNotEmpty()
  @MaxLength(SPOT_TITLE_MAX_LENGTH)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Cómo entrar -- privado, ver ParkingSpot.accessInstructions. "" lo borra.
  @IsOptional()
  @IsString()
  @MaxLength(ACCESS_INSTRUCTIONS_MAX_LENGTH)
  accessInstructions?: string;

  // Alquiler por hora -- ver el comentario en ParkingSpot.hourlyEnabled. Al
  // igual que stayEnabled, acá es un PATCH parcial: la coherencia
  // "si hourlyEnabled=true, pricePerHour tiene que existir" se valida en
  // ParkingSpotsService.update() contra el estado ya mergeado.
  @IsOptional()
  @IsBoolean()
  hourlyEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  pricePerHour?: number;

  // Precio por hora distinto según tipo de vehículo -- ver el comentario en
  // CreateParkingSpotDto. Mandar `null` explícito borra el mapa (vuelve a
  // usar pricePerHour para todos); omitir el campo deja lo que ya había.
  @IsOptional()
  @IsObject()
  pricePerHourByVehicleType?: Partial<Record<VehicleType, number>> | null;

  @IsOptional()
  @IsBoolean()
  covered?: boolean;

  // Igual que en create: si viene, no puede ser un array vacío -- una
  // cochera siempre tiene que quedar apta para al menos un tipo de vehículo.
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(VEHICLE_TYPES, { each: true })
  vehicleTypes?: VehicleType[];

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

  // Tarifas de estadía por tipo de vehículo -- ver CreateParkingSpotDto. `null` explícito
  // vuelve a las mismas tarifas para todos (pricePerDay/Week/Month, que hay que mandar en
  // el mismo request); omitir el campo deja lo que ya había.
  @IsOptional()
  @IsObject()
  stayPricesByVehicleType?: Partial<Record<VehicleType, StayRates>> | null;

  // "Pedir el vehículo al reservar" -- ver ParkingSpot.requireVehicle.
  @IsOptional()
  @IsBoolean()
  requireVehicle?: boolean;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'stayAvailableFrom must be a plain date in YYYY-MM-DD format' })
  stayAvailableFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'stayAvailableUntil must be a plain date in YYYY-MM-DD format' })
  stayAvailableUntil?: string;
}
