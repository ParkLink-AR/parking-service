import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { StaysService } from './stays.service';
import { StayQuoteQueryDto } from './dto/stay-quote-query.dto';
import { StayAvailabilityQueryDto } from './dto/stay-availability-query.dto';

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
    return this.staysService.getQuote(id, query.startDate, query.unit, query.count);
  }

  // Calendario de disponibilidad para elegir fecha de inicio de estadía --
  // contraparte de GET .../availability (horaria) para el otro modo de
  // reserva. Antes que la ruta de arriba en el código no importa: son
  // sufijos literales distintos sobre el mismo :id, no hay ambigüedad de
  // matching entre "quote" y "availability".
  @Get(':id/stays/availability')
  getAvailabilityCalendar(@Param('id', ParseUUIDPipe) id: string, @Query() query: StayAvailabilityQueryDto) {
    return this.staysService.getAvailabilityCalendar(id, query.from, query.to, query.unit, query.count);
  }
}
