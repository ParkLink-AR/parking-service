import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { compressImage, SPOT_PHOTO_MAX_DIMENSION, VERIFICATION_PHOTO_MAX_DIMENSION } from '../storage/image-compression';
import { randomUUID } from 'node:crypto';
import { MAX_PHOTOS, MAX_VERIFICATION_PHOTOS, ParkingSpotsService } from './parking-spots.service';
import { SearchParkingSpotDto } from './dto/search-parking-spot.dto';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DeletePhotoDto } from './dto/delete-photo.dto';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import { ReviewParkingSpotDto } from './dto/review-parking-spot.dto';
import { ModerateParkingSpotDto } from './dto/moderate-parking-spot.dto';
import { ParkingSpotsBatchQueryDto } from './dto/parking-spots-batch-query.dto';
import { AvailabilityService } from '../availability/availability.service';
import { AvailabilityQueryDto } from '../availability/dto/availability-query.dto';
import { StorageService } from '../storage/storage.service';

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// What's accepted on the way in -- every photo is then compressed (see compressImage), so
// this only bounds what an upload can send, not what gets stored.
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_BATCH_IDS = 100;


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

  @Get('parking-spots')
  findByIds(@Query() query: ParkingSpotsBatchQueryDto) {
    const ids = query.ids.split(',');
    if (ids.length > MAX_BATCH_IDS) {
      throw new BadRequestException(`ids must not contain more than ${MAX_BATCH_IDS} entries.`);
    }
    return this.parkingSpotsService.findByIds(ids, { includeDeleted: query.includeDeleted === 'true' });
  }

  // ?includeDeleted=true also resolves a spot its owner deleted (status "deleted") -- a booking's
  // screens still need to show which spot it was. Only public data, same as any listed spot.
  @Get('parking-spots/:id')
  findById(@Param('id') id: string, @Query('includeDeleted') includeDeleted?: string) {
    return this.parkingSpotsService.findById(id, { includeDeleted: includeDeleted === 'true' });
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
  findAllByOwner(@Param('id') id: string, @Query('includeDeleted') includeDeleted?: string) {
    return this.parkingSpotsService.findAllByOwner(id, includeDeleted === 'true');
  }

  @Patch('parking-spots/:id/status')
  setStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.parkingSpotsService.setStatus(id, this.requireUserId(userId), dto.status);
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
      files.map(async (file) => {
        const image = await compressImage(file.buffer, SPOT_PHOTO_MAX_DIMENSION);
        return this.storageService.uploadObject(
          `parking-spots/${id}/${randomUUID()}.${image.extension}`,
          image.buffer,
          image.contentType,
        );
      }),
    );
    return this.parkingSpotsService.addPhotos(id, ownerId, urls);
  }

  // Documentación de respaldo para que un admin apruebe la cochera --
  // separada de /photos (esas son las fotos de marketing que ve el
  // conductor). Mismo Interceptor/límites que uploadPhotos.
  @Post('parking-spots/:id/verification-photos')
  @UseInterceptors(
    FilesInterceptor('files', MAX_VERIFICATION_PHOTOS, {
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
  async uploadVerificationPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Headers('x-user-id') userId?: string,
  ) {
    const ownerId = this.requireUserId(userId);
    if (!files || files.length === 0) {
      throw new BadRequestException('No se recibió ninguna imagen (campo "files").');
    }
    const urls = await Promise.all(
      files.map(async (file) => {
        const image = await compressImage(file.buffer, VERIFICATION_PHOTO_MAX_DIMENSION);
        return this.storageService.uploadObject(
          `parking-spots/${id}/verification/${randomUUID()}.${image.extension}`,
          image.buffer,
          image.contentType,
        );
      }),
    );
    return this.parkingSpotsService.addVerificationPhotos(id, ownerId, urls);
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

  @Delete('parking-spots/:id')
  async remove(@Param('id') id: string, @Headers('x-user-id') userId?: string) {
    const ownerId = this.requireUserId(userId);
    const deletedPhotos = await this.parkingSpotsService.remove(id, ownerId);
    await Promise.all(deletedPhotos.map((url) => this.storageService.deleteObject(url)));
    return { message: 'Cochera eliminada.' };
  }

  // Internas, service-to-service only -- las llama auth-service directo en la red de
  // docker al suspender, cerrar o eliminar una cuenta (mismo esquema que las llamadas de
  // BookingClientService a booking-service: sin ruta en el gateway, sin x-user-id).
  // Nunca agregarlas a gateway/app/routes.py: cualquier usuario logueado podría pausar o
  // borrar las cocheras de otro por id.
  @Post('internal/owners/:ownerId/parking-spots/pause')
  async pauseAllForOwner(@Param('ownerId', ParseUUIDPipe) ownerId: string) {
    return { spot_ids: await this.parkingSpotsService.pauseAllForOwner(ownerId) };
  }

  @Post('internal/owners/:ownerId/parking-spots/restore')
  async restoreAllForOwner(@Param('ownerId', ParseUUIDPipe) ownerId: string) {
    await this.parkingSpotsService.restoreAllForOwner(ownerId);
    return { status: 'ok' };
  }

  @Post('internal/owners/:ownerId/parking-spots/archive')
  async archiveAllForOwner(@Param('ownerId', ParseUUIDPipe) ownerId: string) {
    const photos = await this.parkingSpotsService.archiveAllForOwner(ownerId);
    await Promise.all(photos.map((url) => this.storageService.deleteObject(url)));
    return { status: 'ok' };
  }

  // Rutas de backoffice: el gateway sólo las expone con AuthMode.ADMIN (ver
  // gateway/app/routes.py), así que el trust boundary es el gateway mismo --
  // igual que /admin/tickets en booking-service, este controller no vuelve
  // a chequear un rol acá.
  // Sin status: las pendientes de revisión (lo que usa "Cocheras nuevas"). Con status o q:
  // el buscador de todas las cocheras del panel.
  @Get('admin/parking-spots')
  findForAdmin(@Query('status') status?: string, @Query('q') query?: string) {
    if (!status && !query) return this.parkingSpotsService.findPendingReview();
    return this.parkingSpotsService.adminSearch(status, query);
  }

  @Patch('admin/parking-spots/:id/moderation')
  moderateSpot(@Param('id') id: string, @Body() dto: ModerateParkingSpotDto) {
    return this.parkingSpotsService.moderate(id, dto.action, dto.reason ?? null);
  }

  @Get('admin/parking-spots/:id')
  findForReview(@Param('id') id: string) {
    return this.parkingSpotsService.findById(id);
  }

  @Patch('admin/parking-spots/:id/review')
  reviewSpot(@Param('id') id: string, @Body() dto: ReviewParkingSpotDto) {
    return this.parkingSpotsService.reviewSpot(id, dto.decision, dto.notes ?? null);
  }
}
