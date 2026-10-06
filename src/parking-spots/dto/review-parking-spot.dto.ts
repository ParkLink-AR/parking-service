import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewParkingSpotDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
