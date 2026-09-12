import { IsISO8601, Matches } from 'class-validator';

// Calendario día por día -- a diferencia de StayQuoteQueryDto, no necesita
// duración ni hora: cada día se marca disponible/no-disponible por sí solo
// (ver el comentario en StaysService.getAvailabilityCalendar). El chequeo
// real y definitivo del rango completo pasa recién en /stays/quote, una vez
// que el conductor eligió fecha de inicio, fin y hora de check-in.
export class StayAvailabilityQueryDto {
  // Ver el comentario en StayQuoteQueryDto.startDate -- IsISO8601 solo
  // acepta datetimes completos, que rompen buenos-aires-time.ts's
  // buenosAiresMidnight().
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be a plain date in YYYY-MM-DD format' })
  from!: string;

  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be a plain date in YYYY-MM-DD format' })
  to!: string;
}
