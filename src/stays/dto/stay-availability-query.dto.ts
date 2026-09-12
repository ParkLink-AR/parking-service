import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, Matches, Min } from 'class-validator';
import { StayUnit } from './stay-quote-query.dto';

// unit/count van con el mismo criterio que StayQuoteQueryDto -- el
// calendario pinta cada día según si ARRANCAR una estadía de esa unidad y
// cantidad ahí es válida, así que necesita saber cuál para calcular el
// rango real que ocuparía.
export class StayAvailabilityQueryDto {
  // Ver el comentario en StayQuoteQueryDto.startDate -- IsISO8601 solo
  // acepta datetimes completos, que rompen buenos-aires-time.ts's addDays().
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be a plain date in YYYY-MM-DD format' })
  from!: string;

  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be a plain date in YYYY-MM-DD format' })
  to!: string;

  @IsIn([StayUnit.DAY, StayUnit.WEEK, StayUnit.MONTH])
  unit!: StayUnit;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;
}
