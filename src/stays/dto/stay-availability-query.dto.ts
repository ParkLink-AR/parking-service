import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, Min } from 'class-validator';
import { StayUnit } from './stay-quote-query.dto';

// unit/count van con el mismo criterio que StayQuoteQueryDto -- el
// calendario pinta cada día según si ARRANCAR una estadía de esa unidad y
// cantidad ahí es válida, así que necesita saber cuál para calcular el
// rango real que ocuparía.
export class StayAvailabilityQueryDto {
  @IsISO8601({ strict: true })
  from!: string;

  @IsISO8601({ strict: true })
  to!: string;

  @IsIn([StayUnit.DAY, StayUnit.WEEK, StayUnit.MONTH])
  unit!: StayUnit;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;
}
