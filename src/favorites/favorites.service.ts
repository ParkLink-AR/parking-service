import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { ParkingSpotResponse, ParkingSpotsService } from '../parking-spots/parking-spots.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite) private readonly favoriteRepo: Repository<Favorite>,
    private readonly parkingSpotsService: ParkingSpotsService,
  ) {}

  async add(userId: string, parkingSpotId: string): Promise<void> {
    // Confirma que la cochera exista (y esté activa) antes de guardar el
    // favorito -- findById tira 404 si no.
    await this.parkingSpotsService.findById(parkingSpotId);

    // ON CONFLICT DO NOTHING: marcar como favorita una cochera ya
    // favoriteada es un no-op, no un error.
    await this.favoriteRepo
      .createQueryBuilder()
      .insert()
      .into(Favorite)
      .values({ userId, parkingSpotId })
      .orIgnore()
      .execute();
  }

  async remove(userId: string, parkingSpotId: string): Promise<void> {
    await this.favoriteRepo.delete({ userId, parkingSpotId });
  }

  async listIds(userId: string): Promise<string[]> {
    const favorites = await this.favoriteRepo.find({ where: { userId } });
    return favorites.map((f) => f.parkingSpotId);
  }

  /**
   * Cocheras favoriteadas por el usuario, con el mismo shape que el resto de
   * la API (ver ParkingSpotsService.findById). Las que ya no existen o
   * dejaron de estar activas (soft-delete) se descartan en silencio en vez
   * de romper la lista completa.
   */
  async listSpots(userId: string): Promise<ParkingSpotResponse[]> {
    const ids = await this.listIds(userId);
    const results = await Promise.allSettled(ids.map((id) => this.parkingSpotsService.findById(id)));
    return results
      .filter((r): r is PromiseFulfilledResult<ParkingSpotResponse> => r.status === 'fulfilled')
      .map((r) => r.value);
  }
}
