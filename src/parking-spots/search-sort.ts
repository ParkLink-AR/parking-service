/** How search results can be ordered: nearest first (the default), cheapest first, or best rated first. */
export const SEARCH_SORTS = ['distance', 'price', 'rating'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export interface SortableSpot {
  distanceMeters?: number;
  hourlyEnabled: boolean;
  pricePerHour: number | null;
  pricePerHourByVehicleType: Partial<Record<string, number>> | null;
  stayEnabled: boolean;
  pricePerDay: number | null;
  stayPricesByVehicleType: Partial<Record<string, { day: number }>> | null;
  rating: number;
  reviewCount: number;
}

function cheapest(values: (number | null | undefined)[]): number | null {
  const prices = values.filter((value): value is number => typeof value === 'number' && value > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/**
 * The price a spot is compared by: its lowest hourly rate (any vehicle) -- or, when looking
 * for stays, its lowest daily rate. The platform's commission is the same percentage for
 * every spot, so the owner's own rates order them exactly as drivers see them. null when it
 * has no such price (a stay-only spot in an hourly search).
 */
export function comparablePrice(spot: SortableSpot, stays: boolean): number | null {
  if (stays) {
    if (!spot.stayEnabled) return null;
    const perVehicle = Object.values(spot.stayPricesByVehicleType ?? {}).map((rates) => rates?.day);
    return cheapest([spot.pricePerDay, ...perVehicle]);
  }
  if (!spot.hourlyEnabled) return null;
  return cheapest([spot.pricePerHour, ...Object.values(spot.pricePerHourByVehicleType ?? {})]);
}

/**
 * Orders spots for the search results. Distance always breaks ties, so the order is stable
 * and the closest of two equals comes first. By price, spots without a comparable price go
 * last; by rating, the ones nobody reviewed yet go last.
 */
export function sortSpots<T extends SortableSpot>(spots: T[], sort: SearchSort | undefined, stays = false): T[] {
  const distance = (spot: T) => spot.distanceMeters ?? Number.MAX_SAFE_INTEGER;
  const byDistance = (a: T, b: T) => distance(a) - distance(b);
  const sorted = [...spots];
  if (sort === 'price') {
    sorted.sort((a, b) => {
      const priceA = comparablePrice(a, stays) ?? Number.POSITIVE_INFINITY;
      const priceB = comparablePrice(b, stays) ?? Number.POSITIVE_INFINITY;
      return priceA === priceB ? byDistance(a, b) : priceA - priceB;
    });
  } else if (sort === 'rating') {
    sorted.sort((a, b) => {
      const reviewedA = a.reviewCount > 0 ? 1 : 0;
      const reviewedB = b.reviewCount > 0 ? 1 : 0;
      if (reviewedA !== reviewedB) return reviewedB - reviewedA;
      if (a.rating !== b.rating) return b.rating - a.rating;
      if (a.reviewCount !== b.reviewCount) return b.reviewCount - a.reviewCount;
      return byDistance(a, b);
    });
  } else {
    sorted.sort(byDistance);
  }
  return sorted;
}
