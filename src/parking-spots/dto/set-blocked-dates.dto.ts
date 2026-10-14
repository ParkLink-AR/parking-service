import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, Matches, ValidateNested } from 'class-validator';

export const ACCESS_INSTRUCTIONS_MAX_LENGTH = 1000;
export const MAX_BLOCKED_RANGES = 60;

const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class BlockedDateRangeDto {
  @Matches(PLAIN_DATE, { message: 'from debe ser una fecha YYYY-MM-DD' })
  from!: string;

  @Matches(PLAIN_DATE, { message: 'to debe ser una fecha YYYY-MM-DD' })
  to!: string;
}

// El listado completo de días bloqueados de la cochera (reemplaza al anterior).
export class SetBlockedDatesDto {
  @IsArray()
  @ArrayMaxSize(MAX_BLOCKED_RANGES)
  @ValidateNested({ each: true })
  @Type(() => BlockedDateRangeDto)
  ranges!: BlockedDateRangeDto[];
}
