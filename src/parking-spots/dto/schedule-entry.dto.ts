import { IsInt, Max, Min } from 'class-validator';

// Una franja horaria publicada para un día de la semana. dayOfWeek usa el
// mismo índice que AvailabilityPicker.DaySchedule del lado mobile: 0=Lunes
// … 6=Domingo. Puede haber más de una entrada para el mismo día (turno
// partido) siempre que no se solapen -- ver
// ParkingSpotsService.validateNoScheduleOverlap.
export class ScheduleEntryDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;

  @IsInt()
  @Min(1)
  @Max(24)
  endHour!: number;
}
