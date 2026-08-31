import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { MAX_PHOTOS, ParkingSpotsService } from './parking-spots.service';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { DeletePhotoDto } from './dto/delete-photo.dto';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import { AvailabilityService } from '../availability/availability.service';
import { AvailabilityQueryDto } from '../availability/dto/availability-query.dto';
import { StorageService } from '../storage/storage.service';

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB, same cap as auth-service's avatar upload

function extensionFor(mimetype: string): string {
  const subtype = mimetype.split('/')[1];
  return subtype === 'jpeg' ? 'jpg' : subtype;
}

@Controller()
export class ParkingSpotsController {
  constructor(
    private readonly parkingSpotsService: ParkingSpotsService,
    private readonly availabilityService: AvailabilityService,
    private readonly storageService: StorageService,
  ) {}

  private requireUserId(userId?: string): string {
    // Same reasoning as create(): this only runs behind the gateway, which
    // always sets x-user-id for REQUIRED routes.
    if (!userId) {
      throw new BadRequestException('Missing x-user-id header (request must go through the gateway).');
    }
    return userId;
  }

  @Get('parking-spots/search')
  search(@Query() filters: SearchParkingSpotDto) {
    return this.parkingSpotsService.search(filters);
  }

  @Get('parking-spots/:id')
  findById(@Param('id') id: string) {
    return this.parkingSpotsService.findById(id);
  }

  @Get('parking-spots/:id/availability')
  getAvailability(@Param('id', ParseUUIDPipe) id: string, @Query() query: AvailabilityQueryDto) {
    return this.availabilityService.getAvailability(id, query.from, query.to);
  }

  @Post('parking-spots')
  create(@Body() dto: CreateParkingSpotDto, @Headers('x-user-id') ownerId?: string) {
    // El gateway ya verificó el JWT y manda el user_id en x-user-id para
    // rutas REQUIRED (ver gateway/app/proxy.py). Si falta, alguien le está
    // pegando directo a este servicio sin pasar por el gateway -- fallamos
    // fuerte en vez de crear una cochera con un owner random inservible
    // (Santiago había resuelto esto mismo con un fallback a uuidv4(); se
    // prefiere fallar acá porque este servicio nunca se llama directo, sólo
    // vía gateway).
    if (!ownerId) {
      throw new BadRequestException('Missing x-user-id header (request must go through the gateway).');
    }
    return this.parkingSpotsService.create(dto, ownerId);
  }

  @Put('parking-spots/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParkingSpotDto,
    @Headers('x-user-id') _userId?: string,
  ) {
    return this.parkingSpotsService.update(id, dto);
  }

  @Get('users/:id/parking-spots')
  findAllByOwner(@Param('id') id: string) {
    return this.parkingSpotsService.findAllByOwner(id);
  }

  @Post('parking-spots/:id/photos')
  @UseInterceptors(
    FilesInterceptor('files', MAX_PHOTOS, {
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_PHOTO_TYPES.has(file.mimetype)) {
          callback(new BadRequestException('Formato no permitido. Usá JPEG, PNG o WEBP.'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Headers('x-user-id') userId?: string,
  ) {
    const ownerId = this.requireUserId(userId);
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibió ninguna imagen (campo "files").');
    }
    const urls = await Promise.all(
      files.map((file) =>
        this.storageService.uploadObject(
          `parking-spots/${id}/${randomUUID()}.${extensionFor(file.mimetype)}`,
          file.buffer,
          file.mimetype,
        ),
      ),
    );
    return this.parkingSpotsService.addPhotos(id, ownerId, urls);
  }

  @Get('parking-spots/:id/photos')
  async getPhotos(@Param('id') id: string) {
    const spot = await this.parkingSpotsService.findById(id);
    return { photos: spot.photos };
  }

  @Delete('parking-spots/:id/photos')
  async deletePhoto(
    @Param('id') id: string,
    @Body() dto: DeletePhotoDto,
    @Headers('x-user-id') userId?: string,
  ) {
    const ownerId = this.requireUserId(userId);
    const updated = await this.parkingSpotsService.removePhoto(id, ownerId, dto.url);
    await this.storageService.deleteObject(dto.url);
    return updated;
  }

  @Put('parking-spots/:id/photos/order')
  reorderPhotos(@Param('id') id: string, @Body() dto: ReorderPhotosDto, @Headers('x-user-id') userId?: string) {
    const ownerId = this.requireUserId(userId);
    return this.parkingSpotsService.reorderPhotos(id, ownerId, dto.photos);
  }
}
