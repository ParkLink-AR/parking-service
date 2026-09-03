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

interface BookableSpotsResponse {
  bookable_parking_spot_ids: string[];
}

interface SpotRatingsResponse {
  ratings: Record<string, { average_rating: number; count: number }>;
}

export interface SpotRating {
  rating: number;
  reviewCount: number;
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

  /**
   * Asks booking-service which of parkingSpotIds have no booking occupying [start, end).
   * start/end are full RFC3339 timestamps -- booking-service's POST /parking-spots/bookable
   * only checks existing bookings, not published hours (that's the spot's own schedule,
   * which parking-service already has locally and doesn't need to ask for).
   */
  async getBookableSpotIds(parkingSpotIds: string[], start: string, end: string): Promise<string[]> {
    if (parkingSpotIds.length === 0) return [];

    const baseUrl = this.configService.get<string>('BOOKING_SERVICE_URL');

    try {
      const response = await firstValueFrom(
        this.httpService.post<BookableSpotsResponse>(`${baseUrl}/parking-spots/bookable`, {
          parking_spot_ids: parkingSpotIds,
          start,
          end,
        }),
      );
      return response.data.bookable_parking_spot_ids;
    } catch {
      throw new HttpException('booking-service is unavailable', HttpStatus.BAD_GATEWAY);
    }
  }

  /**
   * Real average rating + review count for each of parkingSpotIds, from booking-service's
   * reviews table. Unlike getBookableSpotIds above, a failure here degrades to an empty
   * map instead of throwing -- a rating is cosmetic, not worth failing the whole search
   * over if booking-service is briefly unavailable.
   */
  async getRatings(parkingSpotIds: string[]): Promise<Record<string, SpotRating>> {
    if (parkingSpotIds.length === 0) return {};

    const baseUrl = this.configService.get<string>('BOOKING_SERVICE_URL');

    try {
      const response = await firstValueFrom(
        this.httpService.post<SpotRatingsResponse>(`${baseUrl}/parking-spots/ratings`, {
          parking_spot_ids: parkingSpotIds,
        }),
      );
      const ratings: Record<string, SpotRating> = {};
      for (const [spotId, summary] of Object.entries(response.data.ratings)) {
        ratings[spotId] = { rating: summary.average_rating, reviewCount: summary.count };
      }
      return ratings;
    } catch {
      return {};
    }
  }
}
