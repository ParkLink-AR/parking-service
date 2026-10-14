import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingSpot, ParkingSpotStatus } from '../parking-spots/entities/parking-spot.entity';
import { ParkingSpotSchedule } from '../parking-spots/entities/parking-spot-schedule.entity';
import { BookingClientService } from '../booking-client/booking-client.service';
import { publishedWindowsForDay } from './published-schedule';
import { isDateBlocked } from '../parking-spots/blocked-dates';
import { buenosAiresMidnight, datesInRange, formatBuenosAires } from './buenos-aires-time';
import {
  subtractIntervalsWithCapacity,
  filterOverlapping,
  determineStatus,
  AvailabilityStatus,
  TimeWindow,
} from './interval-math';

const MAX_RANGE_DAYS = 14;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface DayAvailabilityResponse {
  date: string;
  status: AvailabilityStatus;
  free_windows: Array<{ start: string; end: string }>;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(ParkingSpot)
    private readonly parkingSpotRepo: Repository<ParkingSpot>,
    @InjectRepository(ParkingSpotSchedule)
    private readonly scheduleRepo: Repository<ParkingSpotSchedule>,
    private readonly bookingClient: BookingClientService,
  ) {}

  async getAvailability(parkingSpotId: string, from: string, to: string): Promise<{ days: DayAvailabilityResponse[] }> {
    this.validateRange(from, to);

    const spot = await this.parkingSpotRepo.findOne({
      where: { id: parkingSpotId, status: ParkingSpotStatus.ACTIVE },
    });
    if (!spot) {
      throw new NotFoundException('Cochera no encontrada');
    }

    const schedule = await this.scheduleRepo.find({ where: { parkingSpotId } });
    const activeBookings = await this.bookingClient.getActiveBookings(parkingSpotId, from, to);

    const days: DayAvailabilityResponse[] = [];
    for (const dateISO of datesInRange(from, to)) {
      // A day the owner closed by hand counts as closed, whatever the weekly schedule says.
      const baseWindows = isDateBlocked(spot.blockedDates, dateISO) ? [] : publishedWindowsForDay(schedule, dateISO);
      const baseIsEmpty = baseWindows.length === 0;

      let freeWindows: TimeWindow[] = [];
      if (!baseIsEmpty) {
        const dayStart = buenosAiresMidnight(dateISO);
        const dayEnd = new Date(dayStart.getTime() + ONE_DAY_MS);
        const dayBookings = filterOverlapping(activeBookings, dayStart, dayEnd);
        // A spot with capacity N stays free until N bookings overlap the same instant.
        freeWindows = subtractIntervalsWithCapacity(baseWindows, dayBookings, spot.capacity);
      }

      days.push({
        date: dateISO,
        status: determineStatus(baseIsEmpty, freeWindows),
        free_windows: freeWindows.map((window) => ({
          start: formatBuenosAires(window.start),
          end: formatBuenosAires(window.end),
        })),
      });
    }

    return { days };
  }

  private validateRange(from: string, to: string): void {
    if (from >= to) {
      throw new BadRequestException('from must be before to');
    }
    const rangeDays = Math.round((buenosAiresMidnight(to).getTime() - buenosAiresMidnight(from).getTime()) / ONE_DAY_MS);
    if (rangeDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(`date range exceeds maximum of ${MAX_RANGE_DAYS} days`);
    }
  }
}
