import { Module } from '@nestjs/common';
import { SchemaBootstrapService } from './schema-bootstrap.service';

@Module({
  providers: [SchemaBootstrapService],
})
export class DatabaseModule {}
