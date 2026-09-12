import { Type } from 'class-transformer';
import { IsISO8601, IsInt, Matches, Max, Min } from 'class-validator';

// El conductor arma la estadía como (fecha de inicio, fecha de fin, hora de
// check-in) -- ver StaysService.getQuote, que descompone la duración en
// meses/semanas/días para calcular el precio en vez de recibir una unidad ya
// elegida.
export class StayQuoteQueryDto {
  // IsISO8601 solo no alcanza -- acepta datetimes completos ("...T00:00:00Z")
  // además de fechas puras, y buenos-aires-time.ts's buenosAiresMidnight() no
  // sabe parsear eso (revienta con "Invalid time value"). Matches fuerza el
  // formato de fecha pura que esa función espera.
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must be a plain date in YYYY-MM-DD format' })
  startDate!: string;

  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must be a plain date in YYYY-MM-DD format' })
  endDate!: string;

  // Hora de check-in (0-23, hora de Buenos Aires) -- el check-out del último
  // día se pone automáticamente a esta misma hora (ver el comentario en
  // StaysService.getQuote sobre por qué no medianoche a medianoche).
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;
}
