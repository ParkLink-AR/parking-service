import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface PayoutStatusResponse {
  has_payout_info: boolean;
}

@Injectable()
export class AuthClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Whether ownerId has payout info (CBU, account holder name, CUIL) registered in
   * auth-service. Unlike a cosmetic lookup (e.g. BookingClientService.getRatings), this
   * gates a hard business rule -- an owner must not be able to publish a spot without
   * payout info on file -- so it fails *closed*: any network/HTTP error throws instead of
   * silently returning true or false.
   */
  async hasPayoutInfo(ownerId: string): Promise<boolean> {
    const baseUrl = this.configService.get<string>('AUTH_SERVICE_URL');

    try {
      const response = await firstValueFrom(
        this.httpService.get<PayoutStatusResponse>(`${baseUrl}/internal/users/${ownerId}/payout-status`, {
          headers: { 'X-Internal-Key': this.configService.get<string>('INTERNAL_SERVICE_KEY') ?? '' },
        }),
      );
      return response.data.has_payout_info;
    } catch {
      throw new HttpException('auth-service is unavailable', HttpStatus.BAD_GATEWAY);
    }
  }
}
