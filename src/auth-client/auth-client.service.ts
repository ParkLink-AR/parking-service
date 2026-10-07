import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

interface PayoutStatusResponse {
  has_payout_info: boolean;
  account_status: string;
}

export interface OwnerStatus {
  hasPayoutInfo: boolean;
  // ACTIVE, SUSPENDED, PENDING_DELETION or DELETED (auth-service's UserStatus).
  accountStatus: string;
}

@Injectable()
export class AuthClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Whether ownerId has payout info (CBU, account holder name, CUIL) registered in
   * auth-service, and the status of their account. Unlike a cosmetic lookup (e.g.
   * BookingClientService.getRatings), this gates hard business rules -- an owner must not
   * be able to publish a spot without payout info on file, nor while their account is
   * suspended or being deleted -- so it fails *closed*: any network/HTTP error throws
   * instead of silently returning a guess.
   */
  async getOwnerStatus(ownerId: string): Promise<OwnerStatus> {
    const baseUrl = this.configService.get<string>('AUTH_SERVICE_URL');

    try {
      const response = await firstValueFrom(
        this.httpService.get<PayoutStatusResponse>(`${baseUrl}/internal/users/${ownerId}/payout-status`, {
          headers: { 'X-Internal-Key': this.configService.get<string>('INTERNAL_SERVICE_KEY') ?? '' },
        }),
      );
      return { hasPayoutInfo: response.data.has_payout_info, accountStatus: response.data.account_status };
    } catch {
      throw new HttpException('auth-service is unavailable', HttpStatus.BAD_GATEWAY);
    }
  }
}
