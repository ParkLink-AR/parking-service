import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { DemoController } from './demo.controller';
import { DemoSeedService } from './demo-seed.service';

@Module({
  imports: [StorageModule],
  controllers: [DemoController],
  providers: [DemoSeedService],
})
export class DemoModule {}
