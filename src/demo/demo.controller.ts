import { Controller, Get } from '@nestjs/common';
import { DemoSeedService } from './demo-seed.service';

// Solo para otros servicios de ParkLink (X-Internal-Key): el gateway no lo enruta.
@Controller('internal/demo-spots')
export class DemoController {
  constructor(private readonly demoSeedService: DemoSeedService) {}

  @Get()
  list() {
    return this.demoSeedService.listDemoSpots();
  }
}
