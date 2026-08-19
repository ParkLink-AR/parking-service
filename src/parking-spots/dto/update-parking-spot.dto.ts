import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

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
}
