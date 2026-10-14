import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateParkingSpotDto {
  @IsIn(['suspend', 'restore'])
  action!: 'suspend' | 'restore';

  // Obligatorio para suspender (lo valida ParkingSpotsService.moderate).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
