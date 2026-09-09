import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsInt, Min } from 'class-validator';

// Coincide con lo que puede cargar el dueño (pricePerDay/Week/Month en
// ParkingSpot) -- una unidad por tarifa, nada de "estadía" genérica.
export enum StayUnit {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

// El conductor arma la estadía como (fecha de inicio, unidad, cantidad) --
// p.ej. startDate=2026-10-01, unit=week, count=2 -- en vez de mandar
// directamente un rango de fechas, así el precio sale de multiplicar la
// tarifa de esa unidad (ver StaysService), no de contar días a mano.
export class StayQuoteQueryDto {
  @IsISO8601({ strict: true })
  startDate!: string;

  @IsIn([StayUnit.DAY, StayUnit.WEEK, StayUnit.MONTH])
  unit!: StayUnit;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;
}
