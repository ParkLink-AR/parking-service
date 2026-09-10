import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from '../parking-spots/entities/parking-spot.entity';
import { BookingClientService } from '../booking-client/booking-client.service';
import { StayUnit } from './dto/stay-quote-query.dto';
import { addDays, buenosAiresMidnight, datesInRange } from '../availability/buenos-aires-time';
import { subtractIntervalsWithCapacity, TimeWindow } from '../availability/interval-math';

// Tope arbitrario para GET .../stays/availability -- a diferencia del
// endpoint de disponibilidad por hora (que trae las reservas día por día),
// acá se trae todo el rango de reservas en un solo pedido, así que no hay
// costo extra por día; este límite es sólo para no dejar pedir un rango
// absurdo (años) de una sola vez.
const MAX_CALENDAR_RANGE_DAYS = 93;

export interface StayDayAvailability {
  date: string;
  status: 'available' | 'unavailable';
}

// Días calendario que representa cada unidad -- una semana son 7 días
// exactos; un mes se aproxima a 30 (no hay calendario real acá, mismo tipo
// de simplificación que ya usa el resto del sistema para holds/deadlines).
// Sólo define cuántos días bloquea la reserva, no el precio -- eso sale
// siempre de la tarifa que cargó el dueño (pricePerDay/Week/Month), nunca de
// derivar una unidad de otra.
const UNIT_DAYS: Record<StayUnit, number> = {
  [StayUnit.DAY]: 1,
  [StayUnit.WEEK]: 7,
  [StayUnit.MONTH]: 30,
};

export interface StayQuote {
  startDate: string;
  endDate: string;
  unit: StayUnit;
  count: number;
  totalDays: number;
  // Centavos, mismo criterio que booking-service.Booking.Amount y el resto
  // del flujo de pago (ver mobile/app/(driver)/booking/confirm.tsx).
  amount: number;
}

/**
 * Cotiza y valida una estadía (alquiler por día/semana/mes) para una cochera.
 * Es la fuente de verdad del precio de una estadía -- booking-service, al
 * crear la reserva, vuelve a llamar acá (ver su StayPricingClient) para
 * confirmar el amount en vez de confiar en lo que mande el mobile, igual que
 * search() de ParkingSpotsService ya delega en booking-service para saber
 * qué reservas existen en vez de mantener su propia copia.
 */
@Injectable()
export class StaysService {
  constructor(
    @InjectRepository(ParkingSpot)
    private readonly parkingSpotRepo: Repository<ParkingSpot>,
    private readonly bookingClient: BookingClientService,
  ) {}

  async getQuote(parkingSpotId: string, startDate: string, unit: StayUnit, count: number): Promise<StayQuote> {
    const spot = await this.parkingSpotRepo.findOne({
      where: { id: parkingSpotId, status: ParkingSpotStatus.ACTIVE },
    });
    if (!spot) {
      throw new NotFoundException('Cochera no encontrada');
    }
    if (!spot.stayEnabled) {
      throw new BadRequestException('Esta cochera no tiene habilitada la opción de estadía.');
    }

    const rate = this.rateFor(spot, unit);
    const totalDays = UNIT_DAYS[unit] * count;
    const endDate = addDays(startDate, totalDays);

    const today = new Date().toISOString().slice(0, 10);
    const availableFrom = spot.stayAvailableFrom ?? today;
    if (startDate < availableFrom) {
      throw new BadRequestException(`Esta cochera acepta estadías a partir del ${availableFrom}.`);
    }
    // La estadía completa (checkin + duración) tiene que caer dentro de la
    // ventana publicada -- ver el comentario en ParkingSpot.stayAvailableUntil.
    if (spot.stayAvailableUntil !== null && endDate > spot.stayAvailableUntil) {
      throw new BadRequestException(`Esta cochera acepta estadías hasta el ${spot.stayAvailableUntil}.`);
    }

    // spot.maxStayDays no debería ser null acá (stayEnabled=true lo exige,
    // reforzado por el CHECK de la DB) -- el chequeo de todos modos no
    // rompe nada si algún día esa garantía cambia.
    if (spot.maxStayDays !== null && totalDays > spot.maxStayDays) {
      throw new BadRequestException(`La duración máxima de estadía para esta cochera es de ${spot.maxStayDays} días.`);
    }

    await this.assertRangeFree(spot, startDate, endDate);

    return {
      startDate,
      endDate,
      unit,
      count,
      totalDays,
      amount: Math.round(rate * count * 100),
    };
  }

  /**
   * A diferencia de la disponibilidad horaria (que corta el día en franjas
   * libres/ocupadas), una estadía necesita el rango completo [startDate,
   * endDate) libre de punta a punta -- no tiene sentido ofrecer "estadía"
   * partida por una reserva en el medio.
   */
  private async assertRangeFree(spot: ParkingSpot, startDate: string, endDate: string): Promise<void> {
    const activeBookings = await this.bookingClient.getActiveBookings(spot.id, startDate, endDate);
    if (!this.isRangeFree(spot, startDate, endDate, activeBookings)) {
      throw new ConflictException('Esa cochera ya tiene otra reserva que se superpone con esas fechas.');
    }
  }

  /**
   * Chequeo puro: ¿[startDate, endDate) queda completamente libre dado un
   * listado de reservas activas ya traído? Separado de assertRangeFree para
   * que getAvailabilityCalendar pueda reusar la misma lógica sin volver a
   * pedirle las reservas a booking-service por cada día candidato --
   * subtractIntervalsWithCapacity ya sabe recortar un rango contra reservas
   * existentes respetando la capacidad (N lugares idénticos) de la cochera;
   * sólo hace falta chequear que lo que devuelve sea exactamente el rango
   * pedido entero.
   */
  private isRangeFree(spot: ParkingSpot, startDate: string, endDate: string, activeBookings: TimeWindow[]): boolean {
    const stayWindow = { start: buenosAiresMidnight(startDate), end: buenosAiresMidnight(endDate) };

    // Si la estadía arranca "hoy", el tramo entre la medianoche y este
    // instante ya pasó -- una reserva de esta mañana que ya terminó no es un
    // conflicto real para una estadía que arranca ahora. Sólo lo que queda
    // por delante (desde ahora si es hoy, desde la medianoche si es a
    // futuro) tiene que estar libre.
    const checkWindow = {
      start: stayWindow.start.getTime() > Date.now() ? stayWindow.start : new Date(),
      end: stayWindow.end,
    };
    if (checkWindow.start.getTime() >= checkWindow.end.getTime()) return false; // ya pasó por completo

    const free = subtractIntervalsWithCapacity([checkWindow], activeBookings, spot.capacity);
    return (
      free.length === 1 &&
      free[0].start.getTime() === checkWindow.start.getTime() &&
      free[0].end.getTime() === checkWindow.end.getTime()
    );
  }

  /**
   * Calendario de disponibilidad para elegir fecha de inicio de estadía --
   * contraparte de AvailabilityService (horaria) pero con otra noción de
   * "disponible": acá no importa el horario publicado (una cochera de solo
   * estadía no tiene ninguno), sino si el checkin ese día cae dentro de
   * [stayAvailableFrom, stayAvailableUntil] y si una estadía de `unit`x
   * `count` arrancando ahí no choca con otra reserva. Trae las reservas del
   * rango UNA sola vez (no una por día) y hace el resto en memoria.
   */
  async getAvailabilityCalendar(
    parkingSpotId: string,
    from: string,
    to: string,
    unit: StayUnit,
    count: number,
  ): Promise<{ days: StayDayAvailability[] }> {
    if (from >= to) {
      throw new BadRequestException('from must be before to');
    }
    const rangeDays = Math.round(
      (buenosAiresMidnight(to).getTime() - buenosAiresMidnight(from).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (rangeDays > MAX_CALENDAR_RANGE_DAYS) {
      throw new BadRequestException(`date range exceeds maximum of ${MAX_CALENDAR_RANGE_DAYS} days`);
    }

    const spot = await this.parkingSpotRepo.findOne({
      where: { id: parkingSpotId, status: ParkingSpotStatus.ACTIVE },
    });
    if (!spot) {
      throw new NotFoundException('Cochera no encontrada');
    }
    if (!spot.stayEnabled) {
      throw new BadRequestException('Esta cochera no tiene habilitada la opción de estadía.');
    }

    const today = new Date().toISOString().slice(0, 10);
    const availableFrom = spot.stayAvailableFrom ?? today;
    const totalDays = UNIT_DAYS[unit] * count;

    // Un solo pedido para todo el rango de reservas que cualquier día
    // candidato de este calendario podría llegar a chocar contra -- el
    // último día visible más la duración de la estadía.
    const activeBookings = await this.bookingClient.getActiveBookings(spot.id, from, addDays(to, totalDays));

    const days: StayDayAvailability[] = [];
    for (const dateISO of datesInRange(from, to)) {
      const endDate = addDays(dateISO, totalDays);
      const withinWindow =
        dateISO >= today &&
        dateISO >= availableFrom &&
        (spot.maxStayDays === null || totalDays <= spot.maxStayDays) &&
        (spot.stayAvailableUntil === null || endDate <= spot.stayAvailableUntil);

      const status = withinWindow && this.isRangeFree(spot, dateISO, endDate, activeBookings) ? 'available' : 'unavailable';
      days.push({ date: dateISO, status });
    }

    return { days };
  }

  private rateFor(spot: ParkingSpot, unit: StayUnit): number {
    const rate = unit === StayUnit.DAY ? spot.pricePerDay : unit === StayUnit.WEEK ? spot.pricePerWeek : spot.pricePerMonth;
    // No debería pasar con stayEnabled=true (lo exige el CHECK de la DB),
    // pero el tipo de spot.pricePerX es `number | null` -- failsafe explícito
    // en vez de dejar pasar un NaN silencioso al multiplicar más abajo.
    if (rate === null) {
      throw new BadRequestException('La cochera no tiene cargada la tarifa para esa unidad de estadía.');
    }
    return rate;
  }
}
