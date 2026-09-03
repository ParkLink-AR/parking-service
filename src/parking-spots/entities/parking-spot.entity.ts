import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ParkingSpotSchedule } from './parking-spot-schedule.entity';

export enum ParkingSpotStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  DELETED = 'deleted',
}

@Entity('parking_spots')
export class ParkingSpot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ID del propietario (viene de auth-service, no hay FK real entre microservicios)
  // Almacenado como varchar para flexibilidad, pero siempre debe ser un UUID válido
  @Index()
  @Column({ name: 'owner_id', type: 'varchar' })
  ownerId!: string;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  // Columna geoespacial de PostGIS (tipo geography, en SRID 4326 = lat/lng estándar GPS)
  // Se consulta con ST_DWithin para búsquedas por radio (ver ParkingSpotsService)
  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location!: any; // GeoJSON object o string WKT

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePerHour!: number;

  @Column({ default: false })
  covered!: boolean;

  // Si es false, una reserva pagada no pasa a CONFIRMED sola -- queda
  // PENDING_OWNER_APPROVAL hasta que el dueño la apruebe o la rechace (ver
  // booking-service's ConfirmBookingUseCase). Default true para no cambiar
  // el comportamiento de las cocheras que ya existen.
  @Column({ name: 'instant_booking', default: true })
  instantBooking!: boolean;

  // Cuántos lugares idénticos alquila esta cochera contra el mismo id (caso
  // "playa de estacionamiento"). capacity=1 es una cochera común. Hasta
  // `capacity` reservas activas pueden solaparse en la misma franja --
  // booking-service es quien lo hace cumplir; acá sólo se guarda y se
  // reenvía. El CHECK (capacity >= 1) lo agrega SchemaBootstrapService.
  @Column({ type: 'int', default: 1 })
  capacity!: number;

  // Horario semanal recurrente, una fila por franja publicada (ver
  // ParkingSpotSchedule). cascade:true sólo cubre el insert inicial al
  // crear la cochera (ParkingSpotsService.create) -- reemplazar el horario
  // (ParkingSpotsService.replaceSchedule) borra e inserta explícitamente en
  // una transacción en vez de reasignar este array, porque TypeORM corre
  // los INSERTs del cascade antes que los REMOVEs de orphanedRowAction.
  @OneToMany(() => ParkingSpotSchedule, (schedule) => schedule.parkingSpot, { cascade: true })
  schedule!: ParkingSpotSchedule[];

  @Column({ type: 'jsonb', nullable: true })
  photos!: string[];

  @Column({ type: 'jsonb', nullable: true })
  rules!: string[];

  @Column({
    type: 'enum',
    enum: ParkingSpotStatus,
    default: ParkingSpotStatus.ACTIVE,
  })
  status!: ParkingSpotStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
