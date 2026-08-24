import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { GeocodingService } from './geocoding.service';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';

@Controller('geocode')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get()
  search(@Query('q') q?: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException('Query param "q" is required.');
    }
    return this.geocodingService.searchAddress(q.trim());
  }

  @Get('reverse')
  reverse(@Query() { lat, lng }: ReverseGeocodeDto) {
    return this.geocodingService.reverseGeocode(lat, lng);
  }
}
