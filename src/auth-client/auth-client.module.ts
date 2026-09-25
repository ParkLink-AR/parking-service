import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthClientService } from './auth-client.service';

@Module({
  imports: [HttpModule],
  providers: [AuthClientService],
  exports: [AuthClientService],
})
export class AuthClientModule {}
