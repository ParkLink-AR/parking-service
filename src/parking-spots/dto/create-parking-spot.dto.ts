import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateParkingSpotDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Dirección en texto libre. El backend la geocodifica con Nominatim para obtener lat/lng.
  @IsString()
  address!: string;

  @IsNumber()
  @Min(0)
  pricePerHour!: number;

  @IsOptional()
  @IsArray()
  rules?: string[];
}
