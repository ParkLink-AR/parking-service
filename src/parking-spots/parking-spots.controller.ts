import { Body, Controller, Get, Headers, Param, Post, Query, BadRequestException } from '@nestjs/common';
import { ParkingSpotsService } from './parking-spots.service';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';

@Controller()
export class ParkingSpotsController {
  constructor(private readonly parkingSpotsService: ParkingSpotsService) {}

  @Get('parking-spots/search')
  search(@Query() filters: SearchParkingSpotDto) {
    return this.parkingSpotsService.search(filters);
  }

  @Get('parking-spots/:id')
  findById(@Param('id') id: string) {
    return this.parkingSpotsService.findById(id);
  }

  @Post('parking-spots')
  create(@Body() dto: CreateParkingSpotDto, @Headers('x-user-id') ownerId?: string) {
    // El gateway ya verificó el JWT y manda el user_id en x-user-id para
    // rutas REQUIRED (ver gateway/app/proxy.py). Si falta, alguien le está
    // pegando directo a este servicio sin pasar por el gateway.
    if (!ownerId) {
      throw new BadRequestException('Missing x-user-id header (request must go through the gateway).');
    }
    return this.parkingSpotsService.create(dto, ownerId);
  }

  @Get('users/:id/parking-spots')
  findAllByOwner(@Param('id') id: string) {
    return this.parkingSpotsService.findAllByOwner(id);
  }
}
