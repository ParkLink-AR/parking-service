import { ParkingSpot, ParkingSpotStatus } from '../src/parking-spots/entities/parking-spot.entity';
import { VehicleType } from '../src/parking-spots/vehicle-type';

export const OWNER_ID = '11111111-1111-1111-1111-111111111111';
export const SPOT_ID = '22222222-2222-2222-2222-222222222222';

/** A published spot with hourly and stay rentals; override what each test needs. */
export function makeSpot(overrides: Partial<ParkingSpot> = {}): ParkingSpot {
  return Object.assign(new ParkingSpot(), {
    id: SPOT_ID,
    ownerId: OWNER_ID,
    title: 'Cochera de prueba',
    description: null,
    address: 'Honduras 4800, Palermo',
    hourlyEnabled: true,
    pricePerHour: 1000,
    pricePerHourByVehicleType: null,
    stayEnabled: true,
    pricePerDay: 10000,
    pricePerWeek: 60000,
    pricePerMonth: 200000,
    stayAvailableFrom: null,
    stayAvailableUntil: null,
    maxStayDays: 90,
    stayPricesByVehicleType: null,
    halfDayEnabled: false,
    pricePerHalfDay: null,
    requireVehicle: false,
    covered: true,
    vehicleTypes: [VehicleType.CAR],
    capacity: 1,
    photos: [],
    verificationPhotos: [],
    reviewNotes: null,
    rules: [],
    status: ParkingSpotStatus.ACTIVE,
    pausedByAccount: false,
    suspendedByAdmin: false,
    moderationNote: null,
    accessInstructions: null,
    blockedDates: [],
    ...overrides,
  });
}

/** The bits of a TypeORM repository the services use, as jest mocks. */
export function repoReturning<T>(entity: T | null) {
  return {
    findOne: jest.fn().mockResolvedValue(entity),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation(async (value: T) => value),
  };
}

export function bookingClientWith(activeBookings: { start: Date; end: Date }[] = []) {
  return {
    getActiveBookings: jest.fn().mockResolvedValue(activeBookings),
    getBookableSpotIds: jest.fn(),
    getRatings: jest.fn().mockResolvedValue({}),
  };
}
