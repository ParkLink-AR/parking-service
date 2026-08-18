import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
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
  create(
    @Body() dto: CreateParkingSpotDto,
    @Headers('x-user-id') xUserId?: string,
  ) {
    // The gateway injects x-user-id after verifying the JWT (AuthMode.REQUIRED).
    // Fall back to a random UUID only in local/testing environments where the
    // gateway is not in front of this service.
    const ownerId = xUserId ?? uuidv4();
    return this.parkingSpotsService.create(dto, ownerId);
  }

  @Get('users/:id/parking-spots')
  findAllByOwner(@Param('id') id: string) {
    return this.parkingSpotsService.findAllByOwner(id);
  }
}
