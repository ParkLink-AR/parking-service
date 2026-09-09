import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { StaysService } from './stays.service';
import { StayQuoteQueryDto } from './dto/stay-quote-query.dto';

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
}
