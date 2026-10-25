import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { StaysService } from './stays.service';
import { StayQuoteQueryDto } from './dto/stay-quote-query.dto';
import { StayAvailabilityQueryDto } from './dto/stay-availability-query.dto';
import { HalfDayQuoteQueryDto, HalfDayStartsQueryDto } from './dto/half-day-query.dto';

// Sin x-user-id: es una cotización de sólo lectura (no reserva nada), igual
// que GET .../availability. La llama tanto mobile (vía gateway, para
// mostrarle el precio al conductor antes de confirmar) como booking-service
// directo por la red interna (para revalidar el amount al crear la reserva
// en vez de confiar en lo que mande el mobile -- ver StaysService).
@Controller('parking-spots')
export class StaysController {
  constructor(private readonly staysService: StaysService) {}

  @Get(':id/stays/quote')
  getQuote(@Param('id', ParseUUIDPipe) id: string, @Query() query: StayQuoteQueryDto) {
    return this.staysService.getQuote(id, query.startDate, query.endDate, query.startHour, query.vehicleType);
  }

  // Calendario de disponibilidad para elegir fecha de inicio/fin de estadía
  // -- contraparte de GET .../availability (horaria) para el otro modo de
  // reserva. Antes que la ruta de arriba en el código no importa: son
  // sufijos literales distintos sobre el mismo :id, no hay ambigüedad de
  // matching entre "quote" y "availability".
  @Get(':id/stays/availability')
  getAvailabilityCalendar(@Param('id', ParseUUIDPipe) id: string, @Query() query: StayAvailabilityQueryDto) {
    return this.staysService.getAvailabilityCalendar(id, query.from, query.to);
  }

  // "Media estadía (12 h)": the price and exact instants of the block -- read-only, like
  // the stay quote, and asked again by booking-service when it's booked.
  @Get(':id/half-days/quote')
  getHalfDayQuote(@Param('id', ParseUUIDPipe) id: string, @Query() query: HalfDayQuoteQueryDto) {
    return this.staysService.getHalfDayQuote(id, query.date, query.startHour, query.vehicleType);
  }

  // The hours of a day a half-day can start at, for the driver to pick a free one.
  @Get(':id/half-days/starts')
  getHalfDayStarts(@Param('id', ParseUUIDPipe) id: string, @Query() query: HalfDayStartsQueryDto) {
    return this.staysService.getHalfDayStarts(id, query.date);
  }
}
