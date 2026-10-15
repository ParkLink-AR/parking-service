import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ParkingSpot, ParkingSpotStatus } from '../../src/parking-spots/entities/parking-spot.entity';
import { ParkingSpotsService } from '../../src/parking-spots/parking-spots.service';
import { bookingClientWith, makeSpot, OWNER_ID, repoReturning, SPOT_ID } from '../fakes';
import { ba } from '../helpers';

const STRANGER_ID = '99999999-9999-9999-9999-999999999999';

function setup(spot: ParkingSpot | null = makeSpot(), bookings: { start: Date; end: Date }[] = []) {
  const parkingSpotRepo = repoReturning(spot);
  const bookingClient = bookingClientWith(bookings);
  const events = { publish: jest.fn().mockResolvedValue(undefined) };
  const service = new ParkingSpotsService(
    parkingSpotRepo as never,
    repoReturning(null) as never,
    bookingClient as never,
    {} as never,
    events as never,
  );
  // findById reads through a query builder; what these tests check is what got saved.
  jest.spyOn(service, 'findById').mockImplementation(async () => ({ id: SPOT_ID }) as never);
  const saved = () => parkingSpotRepo.save.mock.calls.at(-1)?.[0] as ParkingSpot | undefined;
  return { service, parkingSpotRepo, bookingClient, events, saved };
}

describe('ParkingSpotsService.update', () => {
  it('only lets the owner change their spot', async () => {
    const { service, parkingSpotRepo } = setup();

    await expect(service.update(SPOT_ID, STRANGER_ID, { description: 'hackeada' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(parkingSpotRepo.save).not.toHaveBeenCalled();
  });

  it("saves the owner's changes, trimming the access instructions (empty clears them)", async () => {
    const { service, saved } = setup(makeSpot({ accessInstructions: 'viejo' }));

    await service.update(SPOT_ID, OWNER_ID, { description: 'Nueva', accessInstructions: '  Portón 4821  ' });
    expect(saved()?.description).toBe('Nueva');
    expect(saved()?.accessInstructions).toBe('Portón 4821');

    await service.update(SPOT_ID, OWNER_ID, { accessInstructions: '   ' });
    expect(saved()?.accessInstructions).toBeNull();
  });

  it('a new address sends a published spot back to review', async () => {
    const { service, saved } = setup();

    await service.update(SPOT_ID, OWNER_ID, { address: 'Juncal 1980, Recoleta', lat: -34.59, lng: -58.39 });
    expect(saved()?.status).toBe(ParkingSpotStatus.PENDING_REVIEW);
    expect(saved()?.title).toBe('Juncal 1980');
  });

  it('other changes keep it published', async () => {
    const { service, saved } = setup();

    await service.update(SPOT_ID, OWNER_ID, { pricePerHour: 1500 });
    expect(saved()?.status).toBe(ParkingSpotStatus.ACTIVE);
  });

  it('refuses a spot that offers neither hourly nor stays', async () => {
    const { service } = setup();

    await expect(service.update(SPOT_ID, OWNER_ID, { hourlyEnabled: false, stayEnabled: false })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('ParkingSpotsService.setBlockedDates', () => {
  beforeAll(() => jest.useFakeTimers().setSystemTime(ba('2026-10-15', 12)));
  afterAll(() => jest.useRealTimers());

  it('saves the upcoming ranges, sorted, and drops the ones already over', async () => {
    const { service, saved } = setup();

    await service.setBlockedDates(SPOT_ID, OWNER_ID, [
      { from: '2026-11-01', to: '2026-11-03' },
      { from: '2026-10-01', to: '2026-10-02' },
      { from: '2026-10-20', to: '2026-10-20' },
    ]);
    expect(saved()?.blockedDates).toEqual([
      { from: '2026-10-20', to: '2026-10-20' },
      { from: '2026-11-01', to: '2026-11-03' },
    ]);
  });

  it("won't close a day that already has a booking", async () => {
    const { service, parkingSpotRepo } = setup(makeSpot(), [{ start: ba('2026-10-20', 10), end: ba('2026-10-20', 12) }]);

    await expect(service.setBlockedDates(SPOT_ID, OWNER_ID, [{ from: '2026-10-20', to: '2026-10-21' }])).rejects.toThrow(
      'Ya tenés una reserva el 20/10',
    );
    expect(parkingSpotRepo.save).not.toHaveBeenCalled();
  });

  it('asks booking-service only for the span the ranges cover', async () => {
    const { service, bookingClient } = setup();

    await service.setBlockedDates(SPOT_ID, OWNER_ID, [
      { from: '2026-10-25', to: '2026-10-26' },
      { from: '2026-10-20', to: '2026-10-21' },
    ]);
    expect(bookingClient.getActiveBookings).toHaveBeenCalledWith(SPOT_ID, '2026-10-20', '2026-10-27');
  });

  it('refuses a range that ends before it starts, or one longer than a year', async () => {
    const { service } = setup();

    await expect(service.setBlockedDates(SPOT_ID, OWNER_ID, [{ from: '2026-10-22', to: '2026-10-20' }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.setBlockedDates(SPOT_ID, OWNER_ID, [{ from: '2026-10-20', to: '2028-01-01' }])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("is only for the spot's owner", async () => {
    const { service } = setup();

    await expect(service.setBlockedDates(SPOT_ID, STRANGER_ID, [])).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('ParkingSpotsService access instructions', () => {
  it("the owner reads their own; nobody else can through the owner's route", async () => {
    const { service } = setup(makeSpot({ accessInstructions: 'Portón 4821' }));

    await expect(service.getAccessInstructionsForOwner(SPOT_ID, OWNER_ID)).resolves.toEqual({ accessInstructions: 'Portón 4821' });
    await expect(service.getAccessInstructionsForOwner(SPOT_ID, STRANGER_ID)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('ParkingSpotsService.setStatus', () => {
  it('the owner can pause and reactivate', async () => {
    const { service, saved } = setup();

    await service.setStatus(SPOT_ID, OWNER_ID, ParkingSpotStatus.PAUSED);
    expect(saved()?.status).toBe(ParkingSpotStatus.PAUSED);
  });

  it("can't reactivate a spot ParkLink suspended", async () => {
    const { service } = setup(makeSpot({ status: ParkingSpotStatus.PAUSED, suspendedByAdmin: true }));

    await expect(service.setStatus(SPOT_ID, OWNER_ID, ParkingSpotStatus.ACTIVE)).rejects.toThrow('ParkLink suspendió');
  });
});

describe('ParkingSpotsService.moderate', () => {
  it('suspending needs a reason, pauses the spot and tells the owner', async () => {
    const { service, saved, events } = setup();

    await expect(service.moderate(SPOT_ID, 'suspend', '  ')).rejects.toBeInstanceOf(BadRequestException);

    await service.moderate(SPOT_ID, 'suspend', 'Fotos engañosas');
    expect(saved()).toMatchObject({ status: ParkingSpotStatus.PAUSED, suspendedByAdmin: true, moderationNote: 'Fotos engañosas' });
    expect(events.publish).toHaveBeenCalledWith(
      'parking_spot.reviewed',
      expect.objectContaining({ decision: 'suspended', notes: 'Fotos engañosas', owner_user_id: OWNER_ID }),
    );
  });

  it('restoring brings it back to where it was', async () => {
    const { service, saved } = setup(
      makeSpot({ status: ParkingSpotStatus.PAUSED, suspendedByAdmin: true, moderationNote: 'x' }),
    );

    await service.moderate(SPOT_ID, 'restore', null);
    expect(saved()).toMatchObject({ status: ParkingSpotStatus.ACTIVE, suspendedByAdmin: false, moderationNote: null });
  });

  it("restoring keeps it paused when its owner's account is paused", async () => {
    const { service, saved } = setup(
      makeSpot({ status: ParkingSpotStatus.PAUSED, suspendedByAdmin: true, pausedByAccount: true }),
    );

    await service.moderate(SPOT_ID, 'restore', null);
    expect(saved()?.status).toBe(ParkingSpotStatus.PAUSED);
  });

  it("can't suspend twice, nor restore what isn't suspended", async () => {
    await expect(setup(makeSpot({ suspendedByAdmin: true })).service.moderate(SPOT_ID, 'suspend', 'x')).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(setup().service.moderate(SPOT_ID, 'restore', null)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ParkingSpotsService.reviewSpot', () => {
  it('approving publishes a spot waiting for review and tells the owner', async () => {
    const { service, saved, events } = setup(makeSpot({ status: ParkingSpotStatus.PENDING_REVIEW }));

    await service.reviewSpot(SPOT_ID, 'approved', null);
    expect(saved()?.status).toBe(ParkingSpotStatus.ACTIVE);
    expect(events.publish).toHaveBeenCalledWith('parking_spot.reviewed', expect.objectContaining({ decision: 'approved' }));
  });

  it('only reviews spots that are waiting for it', async () => {
    await expect(setup().service.reviewSpot(SPOT_ID, 'approved', null)).rejects.toBeInstanceOf(ConflictException);
  });
});
