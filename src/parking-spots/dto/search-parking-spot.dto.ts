import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsLatitude, IsLongitude, IsNumber, IsOptional, Min } from 'class-validator';

export class SearchParkingSpotDto {
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  // Radio de búsqueda en metros. Default: 1500m si no se especifica.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radius?: number = 1500;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  covered?: boolean;
}
