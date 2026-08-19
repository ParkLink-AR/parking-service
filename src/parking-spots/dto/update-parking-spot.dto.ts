import { IsBoolean, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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
  @IsString()
  scheduleText?: string;

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
