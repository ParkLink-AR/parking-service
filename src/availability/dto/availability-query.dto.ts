import { Matches } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class AvailabilityQueryDto {
  @Matches(DATE_ONLY, { message: 'from must be a valid YYYY-MM-DD date' })
  from!: string;

  @Matches(DATE_ONLY, { message: 'to must be a valid YYYY-MM-DD date' })
  to!: string;
}
