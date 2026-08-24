import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ParkingSpot } from './parking-spot.entity';

// Un horario semanal recurrente: una fila por franja publicada. Un mismo día
// puede tener varias filas (ej. turno partido 08-14 y 16-22) -- lo único que
// se prohíbe es que se solapen entre sí, tanto a nivel service
// (ParkingSpotsService.validateNoScheduleOverlap) como con el EXCLUDE USING
// GIST que crea SchemaBootstrapService al arrancar (synchronize:true no sabe
// crear ese tipo de constraint).
@Entity('parking_spot_schedules')
export class ParkingSpotSchedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'parking_spot_id', type: 'uuid' })
  parkingSpotId!: string;

  @ManyToOne(() => ParkingSpot, (spot) => spot.schedule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_spot_id' })
  parkingSpot!: ParkingSpot;

  // 0 = Lunes … 6 = Domingo, mismo índice que AvailabilityPicker.DaySchedule
  // del lado mobile.
  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek!: number;

  @Column({ name: 'start_hour', type: 'smallint' })
  startHour!: number;

  @Column({ name: 'end_hour', type: 'smallint' })
  endHour!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
