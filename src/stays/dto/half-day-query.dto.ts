import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { VehicleType, VEHICLE_TYPES } from '../../parking-spots/vehicle-type';

// A half-day is asked for as (day, start hour): it ends 12 hours later -- see
// StaysService.getHalfDayQuote.
export class HalfDayQuoteQueryDto {
  // A plain date, like StayQuoteQueryDto.startDate (buenosAiresDateTime can't parse more).
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be a plain date in YYYY-MM-DD format' })
  date!: string;

  // 0-23, Buenos Aires time.
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;

  // The driver's vehicle -- needed only when the spot prices its stays by vehicle.
  @IsOptional()
  @IsIn(VEHICLE_TYPES)
  vehicleType?: VehicleType;
}

// The hours a half-day can start at on one day -- see StaysService.getHalfDayStarts.
export class HalfDayStartsQueryDto {
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be a plain date in YYYY-MM-DD format' })
  date!: string;
}
