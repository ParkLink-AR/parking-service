import { comparablePrice, sortSpots, SortableSpot } from '../../src/parking-spots/search-sort';

type Spot = SortableSpot & { id: string };

function spot(id: string, overrides: Partial<Spot> = {}): Spot {
  return {
    id,
    distanceMeters: 1000,
    hourlyEnabled: true,
    pricePerHour: 1000,
    pricePerHourByVehicleType: null,
    stayEnabled: false,
    pricePerDay: null,
    stayPricesByVehicleType: null,
    halfDayEnabled: false,
    pricePerHalfDay: null,
    rating: 0,
    reviewCount: 0,
    ...overrides,
  };
}

const ids = (spots: Spot[]) => spots.map((s) => s.id);

describe('comparablePrice', () => {
  it('is the cheapest hourly rate, any vehicle', () => {
    expect(comparablePrice(spot('a', { pricePerHour: null, pricePerHourByVehicleType: { car: 900, suv: 1200 } }), {})).toBe(900);
  });

  it('is the cheapest daily rate when looking for stays', () => {
    const stay = spot('a', { stayEnabled: true, pricePerDay: 8000, stayPricesByVehicleType: { car: { day: 7000 } } });
    expect(comparablePrice(stay, { stays: true })).toBe(7000);
  });

  it('is null for a spot without that kind of price', () => {
    expect(comparablePrice(spot('a', { hourlyEnabled: false }), {})).toBeNull();
    expect(comparablePrice(spot('a'), { stays: true })).toBeNull();
  });
});

describe('sortSpots', () => {
  const near = spot('near', { distanceMeters: 100, pricePerHour: 3000, rating: 4, reviewCount: 2 });
  const cheap = spot('cheap', { distanceMeters: 900, pricePerHour: 800, rating: 4.9, reviewCount: 20 });
  const unrated = spot('unrated', { distanceMeters: 500, pricePerHour: 1500 });
  const stayOnly = spot('stay-only', { distanceMeters: 50, hourlyEnabled: false, pricePerHour: null });

  it('orders by distance by default', () => {
    expect(ids(sortSpots([cheap, unrated, near, stayOnly], undefined))).toEqual(['stay-only', 'near', 'unrated', 'cheap']);
  });

  it('by price puts the cheapest first and spots without a price last', () => {
    expect(ids(sortSpots([near, stayOnly, cheap, unrated], 'price'))).toEqual(['cheap', 'unrated', 'near', 'stay-only']);
  });

  it('by rating puts the best rated first and the unrated last', () => {
    expect(ids(sortSpots([unrated, near, cheap], 'rating'))).toEqual(['cheap', 'near', 'unrated']);
  });

  it('breaks ties by distance', () => {
    const far = spot('far', { distanceMeters: 5000, pricePerHour: 800 });
    expect(ids(sortSpots([far, cheap], 'price'))).toEqual(['cheap', 'far']);
  });

  it("doesn't change the list it's given", () => {
    const list = [cheap, near];
    sortSpots(list, 'distance');
    expect(ids(list)).toEqual(['cheap', 'near']);
  });
});
