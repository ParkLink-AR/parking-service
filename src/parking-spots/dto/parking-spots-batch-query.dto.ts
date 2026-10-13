import { IsIn, IsOptional, Matches } from 'class-validator';

// Comma-separated UUIDs in a single query param (?ids=a,b,c) -- simpler for
// callers to build than repeated ?ids=a&ids=b, and a user's booking history
// is never going to be long enough to hit URL length limits. Validated here
// as a plain string (a UUID-or-comma pattern) and split in the controller --
// @Transform + @IsUUID({each:true}) stacked on the same property didn't
// validate the transformed array as expected.
//
// Shape-only (8-4-4-4-12 hex), not version/variant-restricted -- same as
// ParseUUIDPipe's default and this project's seeded ids, which aren't real
// UUIDv4s.
const UUID_SHAPE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const COMMA_SEPARATED_UUIDS = new RegExp(`^${UUID_SHAPE}(,${UUID_SHAPE})*$`, 'i');

export class ParkingSpotsBatchQueryDto {
  @Matches(COMMA_SEPARATED_UUIDS, { message: 'ids must be one or more UUIDs separated by commas' })
  ids!: string;

  // "true": also resolves spots the owner deleted -- for a driver's booking history, which
  // still has to say which spot each booking was for.
  @IsOptional()
  @IsIn(['true', 'false'])
  includeDeleted?: string;
}
