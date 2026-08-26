import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Put, Query, BadRequestException } from '@nestjs/common';
import { ParkingSpotsService } from './parking-spots.service';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { ParkingSpotsBatchQueryDto } from './dto/parking-spots-batch-query.dto';
import { AvailabilityService } from '../availability/availability.service';
import { AvailabilityQueryDto } from '../availability/dto/availability-query.dto';

const MAX_BATCH_IDS = 100;

@Controller()
export class ParkingSpotsController {
  constructor(
    private readonly parkingSpotsService: ParkingSpotsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Get('parking-spots/search')
  search(@Query() filters: SearchParkingSpotDto) {
    return this.parkingSpotsService.search(filters);
  }

  // Detalle de varias cocheras por id en un solo request -- ver
  // ParkingSpotsService.findByIds. Sin conflicto de ruteo con
  // parking-spots/:id: este path no tiene segmento después de
  // "parking-spots".
  @Get('parking-spots')
  findByIds(@Query() query: ParkingSpotsBatchQueryDto) {
    const ids = query.ids.split(',');
    if (ids.length > MAX_BATCH_IDS) {
      throw new BadRequestException(`ids must not contain more than ${MAX_BATCH_IDS} entries.`);
    }
    return this.parkingSpotsService.findByIds(ids);
  }

  @Get('parking-spots/:id')
  findById(@Param('id') id: string) {
    return this.parkingSpotsService.findById(id);
  }

  @Get('parking-spots/:id/availability')
  getAvailability(@Param('id', ParseUUIDPipe) id: string, @Query() query: AvailabilityQueryDto) {
    return this.availabilityService.getAvailability(id, query.from, query.to);
  }

  @Post('parking-spots')
  create(@Body() dto: CreateParkingSpotDto, @Headers('x-user-id') ownerId?: string) {
    // El gateway ya verificó el JWT y manda el user_id en x-user-id para
    // rutas REQUIRED (ver gateway/app/proxy.py). Si falta, alguien le está
    // pegando directo a este servicio sin pasar por el gateway -- fallamos
    // fuerte en vez de crear una cochera con un owner random inservible
    // (Santiago había resuelto esto mismo con un fallback a uuidv4(); se
    // prefiere fallar acá porque este servicio nunca se llama directo, sólo
    // vía gateway).
    if (!ownerId) {
      throw new BadRequestException('Missing x-user-id header (request must go through the gateway).');
    }
    return this.parkingSpotsService.create(dto, ownerId);
  }

  @Put('parking-spots/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParkingSpotDto,
    @Headers('x-user-id') _userId?: string,
  ) {
    return this.parkingSpotsService.update(id, dto);
  }

  @Get('users/:id/parking-spots')
  findAllByOwner(@Param('id') id: string) {
    return this.parkingSpotsService.findAllByOwner(id);
  }
}
