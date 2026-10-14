import { BlockedDateRange } from '../blocked-dates';
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
import { StayRates, VehicleType } from '../vehicle-type';

export enum ParkingSpotStatus {
  // Cochera recién creada, todavía no aparece en search() -- ver
  // ParkingSpotsService.create()/search(). Pasa a ACTIVE o REJECTED cuando
  // un admin la revisa (ver reviewSpot()).
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  PAUSED = 'paused',
  // Un admin la rechazó en la revisión -- el dueño puede ver por qué en
  // reviewNotes, pero no hay forma de volver a PENDING_REVIEW desde acá:
  // tiene que crear la cochera de nuevo.
  REJECTED = 'rejected',
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

  // Alquiler por hora. Deliberadamente separado en un toggle (como
  // stayEnabled más abajo) en vez de asumido siempre activo: un dueño puede
  // ofrecer sólo estadía y no publicar ningún horario. Default true para no
  // cambiar el comportamiento de las cocheras que ya existen (todas eran
  // "por hora" antes de que existiera este toggle).
  @Column({ name: 'hourly_enabled', default: true })
  hourlyEnabled!: boolean;

  // null cuando hourlyEnabled es false -- ver el CHECK que agrega
  // SchemaBootstrapService y CreateParkingSpotDto/UpdateParkingSpotDto.
  // name explícito para que quede snake_case como sus hermanas price_per_day
  // /price_per_week/price_per_month (antes de este cambio no lo tenía, y la
  // columna quedó como "pricePerHour" literal en la DB).
  @Column({ name: 'price_per_hour', type: 'decimal', precision: 10, scale: 2, nullable: true })
  pricePerHour!: number | null;

  // Alternativa a pricePerHour para cocheras donde el precio depende del
  // tipo de vehículo (p.ej. auto y camioneta pagan distinto) -- null
  // significa "un solo precio para todos" (pricePerHour de arriba se usa
  // igual que siempre). Si está seteado, tiene una entrada para cada tipo
  // en vehicleTypes y pricePerHour deja de exigirse/usarse (ver
  // ParkingSpotsService.validateHourlyCoherence): el conductor elige su
  // vehículo antes de ver un precio real.
  @Column({ name: 'price_per_hour_by_vehicle_type', type: 'jsonb', nullable: true })
  pricePerHourByVehicleType!: Partial<Record<VehicleType, number>> | null;

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

  // Fecha (YYYY-MM-DD) hasta la que se acepta una estadía -- opcional, igual
  // que stayAvailableFrom: null significa "sin fecha límite". Sirve para
  // publicar la cochera por una ventana acotada (p.ej. un fin de semana
  // puntual) en vez de que la estadía quede ofrecida indefinidamente. La
  // estadía completa (checkin + duración) tiene que caer dentro de
  // [stayAvailableFrom, stayAvailableUntil] -- ver StaysService.getQuote.
  @Column({ name: 'stay_available_until', type: 'date', nullable: true })
  stayAvailableUntil!: string | null;

  // Duración máxima de una estadía, en días. Sin esto un conductor podría
  // pedir una "estadía" de dos años.
  @Column({ name: 'max_stay_days', type: 'int', nullable: true })
  maxStayDays!: number | null;

  // Alternativa a pricePerDay/Week/Month para cocheras donde la estadía también cuesta
  // distinto según el vehículo -- null es "las mismas tarifas para todos". Si está
  // seteado, tiene una entrada {day, week, month} por cada tipo en vehicleTypes, y
  // pricePerDay/Week/Month guardan la más baja de cada una (el "desde" que muestran las
  // listas, y lo que sigue exigiendo el CHECK de estadía) -- ver
  // ParkingSpotsService.validateStayCoherence. La cotización usa la del vehículo del
  // conductor (StaysService.getQuote).
  @Column({ name: 'stay_prices_by_vehicle_type', type: 'jsonb', nullable: true })
  stayPricesByVehicleType!: Partial<Record<VehicleType, StayRates>> | null;

  // "Pedir el vehículo al reservar": el conductor tiene que elegir uno de sus vehículos
  // guardados (con patente, salvo una bici) para poder reservar, y el dueño la ve en la
  // reserva. Una cochera que cobra distinto por vehículo lo pide siempre, aunque esto esté
  // en false -- es como se sabe qué tarifa cobrar (ver booking-service). Default false: las
  // cocheras existentes no cambian.
  @Column({ name: 'require_vehicle', default: false })
  requireVehicle!: boolean;

  @Column({ default: false })
  covered!: boolean;

  // Para qué tipo(s) de vehículo es apta la cochera -- una cochera puede
  // aceptar más de uno (p.ej. auto y moto), así que es un array, no un
  // único valor. null en filas viejas anteriores a este campo -- el
  // fallback a ['car'] vive en ParkingSpotsService.toResponse (antes de
  // este campo, toda cochera era implícitamente para autos).
  @Column({ name: 'vehicle_types', type: 'jsonb', nullable: true })
  vehicleTypes!: VehicleType[] | null;

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

  // Fotos de respaldo (escritura, contrato de alquiler, expensas, la
  // cochera misma, etc.) que el dueño sube para que un admin verifique que
  // la cochera es legítima antes de publicarla -- separadas de `photos` a
  // propósito, nunca se muestran al conductor (ver AdminParkingSpotsController
  // más abajo y ParkingSpotsService.addVerificationPhotos/reviewSpot).
  @Column({ name: 'verification_photos', type: 'jsonb', nullable: true })
  verificationPhotos!: string[];

  // Motivo que carga el admin al rechazar (ver reviewSpot()) -- null si
  // nunca se revisó o si se aprobó.
  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  rules!: string[];

  @Column({
    type: 'enum',
    enum: ParkingSpotStatus,
    default: ParkingSpotStatus.ACTIVE,
  })
  status!: ParkingSpotStatus;

  // Puesta en pausa (o retenida, si estaba en revisión) porque la cuenta del dueño está
  // suspendida o eliminándose -- no por el dueño. Mientras esté en true el dueño no la
  // puede reactivar, y al reactivarse la cuenta vuelven a ACTIVE exactamente éstas (ver
  // pauseAllForOwner/restoreAllForOwner en ParkingSpotsService).
  @Column({ name: 'paused_by_account', type: 'boolean', default: false })
  pausedByAccount!: boolean;

  // Suspendida por ParkLink desde el panel (denuncias, problemas): queda PAUSED y el dueño
  // no la puede reactivar hasta que un admin la restaure. moderationNote dice por qué.
  @Column({ name: 'suspended_by_admin', type: 'boolean', default: false })
  suspendedByAdmin!: boolean;

  @Column({ name: 'moderation_note', type: 'text', nullable: true })
  moderationNote!: string | null;

  // Cómo entrar (código del portón, piso, número de lugar, a quién avisar). Privado: nunca
  // sale en las respuestas públicas -- sólo lo leen el dueño y, vía booking-service, el
  // conductor de una reserva confirmada (ver getAccessInstructions).
  @Column({ name: 'access_instructions', type: 'text', nullable: true })
  accessInstructions!: string | null;

  // Días completos que el dueño cerró a mano -- ver blocked-dates.ts.
  @Column({ name: 'blocked_dates', type: 'jsonb', default: () => "'[]'" })
  blockedDates!: BlockedDateRange[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
