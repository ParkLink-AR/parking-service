import { Repository } from 'typeorm';
import { ParkingSpot } from '../parking-spots/entities/parking-spot.entity';
import { BookingClientService } from '../booking-client/booking-client.service';
import { StayUnit } from './dto/stay-quote-query.dto';
export interface StayQuote {
    startDate: string;
    endDate: string;
    unit: StayUnit;
    count: number;
    totalDays: number;
    amount: number;
}
export declare class StaysService {
    private readonly parkingSpotRepo;
    private readonly bookingClient;
    constructor(parkingSpotRepo: Repository<ParkingSpot>, bookingClient: BookingClientService);
    getQuote(parkingSpotId: string, startDate: string, unit: StayUnit, count: number): Promise<StayQuote>;
    private assertRangeFree;
    private rateFor;
}
