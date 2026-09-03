import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ParkingSpot } from '../../parking-spots/entities/parking-spot.entity';

@Entity('favorites')
@Index(['userId', 'parkingSpotId'], { unique: true })
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ID del usuario que favoriteó -- viene de auth-service, mismo criterio
  // sin FK real que ParkingSpot.ownerId (ver ese archivo).
  @Index()
  @Column({ name: 'user_id', type: 'varchar' })
  userId!: string;

  @Column({ name: 'parking_spot_id', type: 'uuid' })
  parkingSpotId!: string;

  // Esta FK sí es real: ParkingSpot vive en la misma base. onDelete CASCADE
  // limpia el favorito solo cuando la cochera se hard-delete (cierre de
  // cuenta del dueño) -- el soft-delete normal deja la fila intacta.
  @ManyToOne(() => ParkingSpot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parking_spot_id' })
  parkingSpot!: ParkingSpot;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
