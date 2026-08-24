import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BookingClientService } from './booking-client.service';

@Module({
  imports: [HttpModule],
  providers: [BookingClientService],
  exports: [BookingClientService],
})
export class BookingClientModule {}
