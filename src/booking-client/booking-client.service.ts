import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TimeWindow } from '../availability/interval-math';

interface ListBookingsResponse {
  bookings: Array<{
    date: string;
    bookings: Array<{ start: string; end: string; status: string }>;
  }>;
}

@Injectable()
export class BookingClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Fetches the parking spot's active bookings (CONFIRMED, or PENDING_PAYMENT with an
   * unexpired hold) from booking-service, overlapping [from, to). from/to are YYYY-MM-DD,
   * passed straight through to booking-service's own date-only query params.
   */
  async getActiveBookings(parkingSpotId: string, from: string, to: string): Promise<TimeWindow[]> {
    const baseUrl = this.configService.get<string>('BOOKING_SERVICE_URL');

    let data: ListBookingsResponse;
    try {
      const response = await firstValueFrom(
        this.httpService.get<ListBookingsResponse>(`${baseUrl}/parking-spots/${parkingSpotId}/bookings`, {
          params: { active: 'true', from, to },
        }),
      );
      data = response.data;
    } catch {
      throw new HttpException('booking-service is unavailable', HttpStatus.BAD_GATEWAY);
    }

    return data.bookings.flatMap((day) =>
      day.bookings.map((booking) => ({ start: new Date(booking.start), end: new Date(booking.end) })),
    );
  }
}
