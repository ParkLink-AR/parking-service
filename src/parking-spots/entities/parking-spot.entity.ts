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

  // "Estadía": alquiler de la cochera por día/semana/mes en vez de por hora
  // (p.ej. quien viaja y necesita dejar el auto varios días). Deliberadamente
  // separado de pricePerHour -- multiplicar la tarifa horaria por 24/168/720
  // le daría al dueño un precio que no eligió. stayEnabled es el toggle que
  // pide el dueño; los tres precios, stayAvailableFrom y maxStayDays sólo se
  // exigen completos cuando está en true (ver CreateParkingSpotDto /
  // UpdateParkingSpotDto y el CHECK que agrega SchemaBootstrapService).
  @Column({ name: 'stay_enabled', default: false })
  stayEnabled!: boolean;

  @Column({ name: 'price_per_day', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerDay!: number | null;

  @Column({ name: 'price_per_week', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerWeek!: number | null;

  @Column({ name: 'price_per_month', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerMonth!: number | null;

  // Fecha (YYYY-MM-DD) a partir de la cual el dueño acepta el check-in de una
  // estadía -- no tiene por qué ser hoy (p.ej. "recién puedo alquilarla desde
  // que me mude"). El conductor puede elegir cualquier fecha de inicio >= esta.
  @Column({ name: 'stay_available_from', type: 'date', nullable: true })
  stayAvailableFrom!: string | null;

  // Duración máxima de una estadía, en días (una semana = 7, un mes = 30 --
  // ver StaysService.UNIT_DAYS). Sin esto un conductor podría pedir una
  // "estadía" de dos años.
  @Column({ name: 'max_stay_days', type: 'int', nullable: true })
  maxStayDays!: number | null;

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
