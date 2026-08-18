import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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

  // Texto libre (ej. "Lun a Vie, 8:00 a 22:00 hs"), tal como lo tipea el
  // owner al publicar -- no hay un horario estructurado todavía.
  @Column({ name: 'schedule_text', type: 'varchar', length: 255, nullable: true })
  scheduleText!: string | null;

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
