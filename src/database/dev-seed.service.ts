import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from '../parking-spots/entities/parking-spot.entity';
import { ParkingSpotSchedule } from '../parking-spots/entities/parking-spot-schedule.entity';

// Cocheras fijas para probar el flujo de búsqueda localmente (radio, horario,
// etc.) sin tener que publicar una a mano cada vez que se levanta el
// entorno. IDs fijos para que sea idempotente: si ya existen (container
// reiniciado, DB persistida), no se duplican.
//
// Sólo corre si SEED_DEV_DATA=true -- no queremos que esto se dispare
// silenciosamente en ningún entorno que no lo pida explícitamente. El
// docker-compose.yml de este repo lo prende por default.
const MOCK_OWNER_ID = '00000000-0000-0000-0000-0000000000f1';

const SEED_SPOTS = [
  {
    id: '00000000-0000-0000-0000-0000000000a1',
    title: 'Cochera Cabildo 2980',
    address: 'Av. Cabildo 2980, Belgrano, CABA',
    lat: -34.5651,
    lng: -58.4557,
    pricePerHour: 900,
    covered: true,
    schedule: [0, 1, 2, 3, 4].map((dayOfWeek) => ({ dayOfWeek, startHour: 8, endHour: 22 })),
  },
  {
    id: '00000000-0000-0000-0000-0000000000a2',
    title: 'Cochera Cabildo 3050',
    address: 'Av. Cabildo 3050, Belgrano, CABA',
    lat: -34.5639,
    lng: -58.4551,
    pricePerHour: 650,
    covered: false,
    schedule: [0, 1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startHour: 7, endHour: 23 })),
  },
];

@Injectable()
export class DevSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevSeedService.name);

  constructor(
    @InjectRepository(ParkingSpot)
    private readonly parkingSpotRepo: Repository<ParkingSpot>,
    @InjectRepository(ParkingSpotSchedule)
    private readonly scheduleRepo: Repository<ParkingSpotSchedule>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.SEED_DEV_DATA !== 'true') return;

    for (const seed of SEED_SPOTS) {
      const exists = await this.parkingSpotRepo.exists({ where: { id: seed.id } });
      if (exists) continue;

      const spot = this.parkingSpotRepo.create({
        id: seed.id,
        ownerId: MOCK_OWNER_ID,
        title: seed.title,
        address: seed.address,
        pricePerHour: seed.pricePerHour,
        covered: seed.covered,
        rules: [],
        status: ParkingSpotStatus.ACTIVE,
        location: { type: 'Point', coordinates: [seed.lng, seed.lat] },
        schedule: seed.schedule.map((entry) => this.scheduleRepo.create(entry)),
      });
      await this.parkingSpotRepo.save(spot);
    }

    this.logger.log(`Dev seed OK (${SEED_SPOTS.length} cocheras de prueba cerca de Cabildo 3000).`);
  }
}
