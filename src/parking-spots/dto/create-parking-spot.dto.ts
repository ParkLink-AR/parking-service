import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  Matches,
  Max,
  Min,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ScheduleEntryDto } from './schedule-entry.dto';
import { VehicleType, VEHICLE_TYPES } from '../vehicle-type';

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

  // Alquiler por hora -- ver el comentario en ParkingSpot.hourlyEnabled.
  // Default true si se omite (compatibilidad con clientes que no lo mandan):
  // @ValidateIf sólo salta pricePerHour cuando viene explícitamente false.
  @IsOptional()
  @IsBoolean()
  hourlyEnabled?: boolean;

  // Opcional apenas se manda pricePerHourByVehicleType -- ahí el precio
  // depende de qué tipo de vehículo elija el conductor y este campo queda
  // sin usar (ver ParkingSpotsService.validateHourlyCoherence, que exige uno
  // de los dos, no los dos a la vez).
  @ValidateIf((dto: CreateParkingSpotDto) => dto.hourlyEnabled !== false && !dto.pricePerHourByVehicleType)
  @IsNumber()
  @Min(0.01)
  pricePerHour?: number;

  // Precio por hora distinto según el tipo de vehículo (auto/pickup/SUV/moto/
  // bici) -- alternativa a pricePerHour para cocheras donde no todos pagan
  // lo mismo (p.ej. una moto más barata que una camioneta). La forma exacta
  // (una entrada por cada tipo en vehicleTypes, valores positivos) se
  // valida en el service, no acá, porque depende de vehicleTypes -- otro
  // campo del mismo DTO -- y class-validator no cruza campos limpio para
  // un objeto de forma dinámica.
  @IsOptional()
  @IsObject()
  pricePerHourByVehicleType?: Partial<Record<VehicleType, number>>;

  @IsOptional()
  @IsBoolean()
  covered?: boolean;

  // Para qué tipo(s) de vehículo es apta -- ver el comentario en
  // ParkingSpot.vehicleTypes. Obligatorio y no vacío: a diferencia de otras
  // características, acá no hay un default razonable que asumir en
  // silencio, el dueño tiene que elegir al menos uno.
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(VEHICLE_TYPES, { each: true })
  vehicleTypes!: VehicleType[];

  // Lugares idénticos que alquila esta cochera contra el mismo id (playa de
  // estacionamiento). Omitido = 1 (cochera común).
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  capacity?: number;

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
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'stayAvailableFrom must be a plain date in YYYY-MM-DD format' })
  stayAvailableFrom?: string;

  // Fecha (YYYY-MM-DD) hasta la que se acepta una estadía -- opcional, igual
  // que stayAvailableFrom. Sirve para publicar la cochera por una ventana
  // acotada (p.ej. un fin de semana) en vez de dejarla ofrecida para
  // siempre. Ver StaysService.getQuote.
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'stayAvailableUntil must be a plain date in YYYY-MM-DD format' })
  stayAvailableUntil?: string;
}
