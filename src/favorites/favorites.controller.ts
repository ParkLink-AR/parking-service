import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  private requireUserId(userId?: string): string {
    // Igual que en ParkingSpotsController: solo corre detrás del gateway,
    // que siempre pone x-user-id en rutas REQUIRED.
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header (request must go through the gateway).');
    }
    return userId;
  }

  @Get()
  listSpots(@Headers('x-user-id') userId?: string) {
    return this.favoritesService.listSpots(this.requireUserId(userId));
  }

  @Get('ids')
  listIds(@Headers('x-user-id') userId?: string) {
    return this.favoritesService.listIds(this.requireUserId(userId));
  }

  @Post()
  async add(@Body() dto: AddFavoriteDto, @Headers('x-user-id') userId?: string) {
    await this.favoritesService.add(this.requireUserId(userId), dto.parkingSpotId);
    return { favorited: true };
  }

  @Delete(':parkingSpotId')
  async remove(
    @Param('parkingSpotId', ParseUUIDPipe) parkingSpotId: string,
    @Headers('x-user-id') userId?: string,
  ) {
    await this.favoritesService.remove(this.requireUserId(userId), parkingSpotId);
    return { favorited: false };
  }
}
