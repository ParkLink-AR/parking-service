import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ParkingSpot } from '../parking-spots/entities/parking-spot.entity';
import { ParkingSpotSchedule } from '../parking-spots/entities/parking-spot-schedule.entity';
export declare class DevSeedService implements OnModuleInit {
    private readonly parkingSpotRepo;
    private readonly scheduleRepo;
    private readonly logger;
    constructor(parkingSpotRepo: Repository<ParkingSpot>, scheduleRepo: Repository<ParkingSpotSchedule>);
    onModuleInit(): Promise<void>;
}
