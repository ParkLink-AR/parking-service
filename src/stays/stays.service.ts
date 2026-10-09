import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from '../parking-spots/entities/parking-spot.entity';
import { BookingClientService } from '../booking-client/booking-client.service';
import { VehicleType } from '../parking-spots/vehicle-type';
import { addOneDay, buenosAiresDateTime, buenosAiresMidnight, datesInRange, formatBuenosAires } from '../availability/buenos-aires-time';
import { subtractIntervalsWithCapacity, TimeWindow } from '../availability/interval-math';

// Tope arbitrario para GET .../stays/availability -- a diferencia del
// endpoint de disponibilidad por hora (que trae las reservas día por día),
// acá se trae todo el rango de reservas en un solo pedido, así que no hay
// costo extra por día; este límite es sólo para no dejar pedir un rango
// absurdo (años) de una sola vez.
const MAX_CALENDAR_RANGE_DAYS = 93;

// Días calendario que representa cada unidad al descomponer una estadía --
// una semana son 7 días exactos, un mes se aproxima a 30 (no hay calendario
// real acá, misma simplificación que ya usa el resto del sistema para
// holds/deadlines). El precio de cada tramo sale siempre de la tarifa que
// cargó el dueño (pricePerDay/Week/Month), nunca de derivar una unidad de
// otra.
const DAYS_PER_MONTH_UNIT = 30;
const DAYS_PER_WEEK_UNIT = 7;

export interface StayDayAvailability {
  date: string;
  status: 'available' | 'unavailable';
}

export interface StayBreakdown {
  months: number;
  weeks: number;
  days: number;
}

export interface StayQuote {
  startDate: string;
  endDate: string;
  // RFC3339 con offset de Buenos Aires -- la hora de check-in que eligió el
  // conductor, aplicada tanto al inicio como al fin (mismo horario de
  // entrada y salida, ver el comentario en getQuote). booking-service usa
  // estos dos tal cual como Start/End de la reserva -- nunca deriva la hora
  // él mismo.
  startDateTime: string;
  endDateTime: string;
  totalDays: number;
  breakdown: StayBreakdown;
  // Centavos, mismo criterio que booking-service.Booking.Amount y el resto
  // del flujo de pago (ver mobile/app/(driver)/booking/confirm.tsx).
  amount: number;
}

/** Cuántos días calendario hay entre dos YYYY-MM-DD (endDate exclusivo). */
function daysBetweenPlainDates(startDate: string, endDate: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((buenosAiresMidnight(endDate).getTime() - buenosAiresMidnight(startDate).getTime()) / msPerDay);
}

/** Descompone una duración en meses/semanas/días de la forma más "grande
 * primero" -- 9 días = 1 semana + 2 días; 35 días = 1 mes + 5 días. Es la
 * misma lógica que fija cuánto se cobra por cada tramo (ver getQuote). */
function decomposeStayDays(totalDays: number): StayBreakdown {
  const months = Math.floor(totalDays / DAYS_PER_MONTH_UNIT);
  const afterMonths = totalDays % DAYS_PER_MONTH_UNIT;
  const weeks = Math.floor(afterMonths / DAYS_PER_WEEK_UNIT);
  const days = afterMonths % DAYS_PER_WEEK_UNIT;
  return { months, weeks, days };
}

/**
 * Cotiza y valida una estadía (rango de fechas, no día/semana/mes fijo) para
 * una cochera. Es la fuente de verdad del precio -- booking-service, al crear
 * la reserva, vuelve a llamar acá (ver su parkingclient.Client.GetStayQuote)
 * para confirmar el rango exacto y el amount en vez de confiar en lo que
 * mande el mobile, igual que search() de ParkingSpotsService ya delega en
 * booking-service para saber qué reservas existen en vez de mantener su
 * propia copia.
 */
@Injectable()
export class StaysService {
  constructor(
    @InjectRepository(ParkingSpot)
    private readonly parkingSpotRepo: Repository<ParkingSpot>,
    private readonly bookingClient: BookingClientService,
  ) {}

  async getQuote(
    parkingSpotId: string,
    startDate: string,
    endDate: string,
    startHour: number,
    vehicleType?: VehicleType,
  ): Promise<StayQuote> {
    const spot = await this.parkingSpotRepo.findOne({
      where: { id: parkingSpotId, status: ParkingSpotStatus.ACTIVE },
    });
    if (!spot) {
      throw new NotFoundException('Cochera no encontrada');
    }
    if (!spot.stayEnabled) {
      throw new BadRequestException('Esta cochera no tiene habilitada la opción de estadía.');
    }
    if (endDate <= startDate) {
      throw new BadRequestException('endDate debe ser posterior a startDate.');
    }

    const rates = this.stayRates(spot, vehicleType);
    const totalDays = daysBetweenPlainDates(startDate, endDate);
    const breakdown = decomposeStayDays(totalDays);
    const amount = Math.round(
      (breakdown.months * rates.month + breakdown.weeks * rates.week + breakdown.days * rates.day) * 100,
    );

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

    // Check-out el último día a la MISMA hora que el check-in -- una estadía
    // se cuenta en períodos de 24hs desde que entra el auto, no medianoche a
    // medianoche (si no, entrar a las 20:00 "perdería" casi un día entero del
    // último tramo). Ambos límites del rango usan esta misma hora.
    const startDateTime = buenosAiresDateTime(startDate, startHour);
    const endDateTime = buenosAiresDateTime(endDate, startHour);
    await this.assertRangeFree(spot, startDate, endDate, startDateTime, endDateTime);

    return {
      startDate,
      endDate,
      startDateTime: formatBuenosAires(startDateTime),
      endDateTime: formatBuenosAires(endDateTime),
      totalDays,
      breakdown,
      amount,
    };
  }

  /**
   * A diferencia de la disponibilidad horaria (que corta el día en franjas
   * libres/ocupadas), una estadía necesita el rango completo [start, end)
   * libre de punta a punta -- no tiene sentido ofrecer "estadía" partida por
   * una reserva en el medio.
   */
  private async assertRangeFree(spot: ParkingSpot, startDate: string, endDate: string, start: Date, end: Date): Promise<void> {
    const activeBookings = await this.bookingClient.getActiveBookings(spot.id, startDate, endDate);
    if (!this.isRangeFree(spot, start, end, activeBookings)) {
      throw new ConflictException('Esa cochera ya tiene otra reserva que se superpone con esas fechas.');
    }
  }

  /**
   * Chequeo puro: ¿[start, end) queda completamente libre dado un listado de
   * reservas activas ya traído? Separado de assertRangeFree para que
   * getAvailabilityCalendar pueda reusar la misma lógica sin volver a
   * pedirle las reservas a booking-service por cada día candidato --
   * subtractIntervalsWithCapacity ya sabe recortar un rango contra reservas
   * existentes respetando la capacidad (N lugares idénticos) de la cochera;
   * sólo hace falta chequear que lo que devuelve sea exactamente el rango
   * pedido entero.
   */
  private isRangeFree(spot: ParkingSpot, start: Date, end: Date, activeBookings: TimeWindow[]): boolean {
    // Si la estadía arranca "ahora" o antes, el tramo entre el inicio pedido
    // y este instante ya pasó -- una reserva de esta mañana que ya terminó no
    // es un conflicto real para una estadía que arranca ahora. Sólo lo que
    // queda por delante tiene que estar libre.
    const checkWindow = {
      start: start.getTime() > Date.now() ? start : new Date(),
      end,
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
   * Calendario de disponibilidad para elegir fecha de inicio/fin de estadía
   * -- contraparte de AvailabilityService (horaria) pero con otra noción de
   * "disponible": acá no importa el horario publicado (una cochera de solo
   * estadía no tiene ninguno), sino si ESE día en particular (medianoche a
   * medianoche) cae dentro de [stayAvailableFrom, stayAvailableUntil] y no
   * tiene ninguna reserva encima. Es una guía día por día, no una garantía
   * para un rango completo -- el chequeo real y definitivo de [startDate,
   * endDate) pasa en getQuote, con la hora de check-in exacta que haya
   * elegido el conductor (acá no se conoce todavía, porque el conductor
   * recién está eligiendo las fechas). Trae las reservas del rango UNA sola
   * vez (no una por día) y hace el resto en memoria.
   */
  async getAvailabilityCalendar(parkingSpotId: string, from: string, to: string): Promise<{ days: StayDayAvailability[] }> {
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

    const activeBookings = await this.bookingClient.getActiveBookings(spot.id, from, to);

    const days: StayDayAvailability[] = [];
    for (const dateISO of datesInRange(from, to)) {
      const withinWindow =
        dateISO >= today &&
        dateISO >= availableFrom &&
        (spot.stayAvailableUntil === null || dateISO <= spot.stayAvailableUntil);

      const dayStart = buenosAiresMidnight(dateISO);
      const dayEnd = buenosAiresMidnight(addOneDay(dateISO));
      const status = withinWindow && this.isRangeFree(spot, dayStart, dayEnd, activeBookings) ? 'available' : 'unavailable';
      days.push({ date: dateISO, status });
    }

    return { days };
  }

  private stayRates(spot: ParkingSpot, vehicleType?: VehicleType): { day: number; week: number; month: number } {
    // Una cochera que cobra la estadía distinto por vehículo cotiza con la tarifa del
    // vehículo del conductor -- sin saber cuál es, no hay precio que dar.
    if (spot.stayPricesByVehicleType) {
      if (!vehicleType) {
        throw new BadRequestException('Esta cochera cobra según el vehículo: elegí con qué vehículo vas.');
      }
      const accepted = spot.vehicleTypes ?? [VehicleType.CAR];
      const rate = spot.stayPricesByVehicleType[vehicleType];
      if (!accepted.includes(vehicleType) || !rate) {
        throw new BadRequestException('Esta cochera no acepta ese tipo de vehículo.');
      }
      return { day: Number(rate.day), week: Number(rate.week), month: Number(rate.month) };
    }
    // No debería pasar con stayEnabled=true (lo exige el CHECK de la DB),
    // pero el tipo de spot.pricePerX es `number | null` -- failsafe explícito
    // en vez de dejar pasar un NaN silencioso al multiplicar más arriba.
    if (spot.pricePerDay === null || spot.pricePerWeek === null || spot.pricePerMonth === null) {
      throw new BadRequestException('La cochera no tiene cargadas las tarifas de estadía.');
    }
    return { day: spot.pricePerDay, week: spot.pricePerWeek, month: spot.pricePerMonth };
  }
}
