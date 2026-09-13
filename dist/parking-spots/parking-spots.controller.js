"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParkingSpotsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const node_crypto_1 = require("node:crypto");
const parking_spots_service_1 = require("./parking-spots.service");
const search_parking_spot_dto_1 = require("./dto/search-parking-spot.dto");
const create_parking_spot_dto_1 = require("./dto/create-parking-spot.dto");
const update_parking_spot_dto_1 = require("./dto/update-parking-spot.dto");
const update_status_dto_1 = require("./dto/update-status.dto");
const delete_photo_dto_1 = require("./dto/delete-photo.dto");
const reorder_photos_dto_1 = require("./dto/reorder-photos.dto");
const parking_spots_batch_query_dto_1 = require("./dto/parking-spots-batch-query.dto");
const availability_service_1 = require("../availability/availability.service");
const availability_query_dto_1 = require("../availability/dto/availability-query.dto");
const storage_service_1 = require("../storage/storage.service");
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_BATCH_IDS = 100;
function extensionFor(mimetype) {
    const subtype = mimetype.split('/')[1];
    return subtype === 'jpeg' ? 'jpg' : subtype;
}
let ParkingSpotsController = class ParkingSpotsController {
    constructor(parkingSpotsService, availabilityService, storageService) {
        this.parkingSpotsService = parkingSpotsService;
        this.availabilityService = availabilityService;
        this.storageService = storageService;
    }
    requireUserId(userId) {
        if (!userId) {
            throw new common_1.BadRequestException('Missing x-user-id header (request must go through the gateway).');
        }
        return userId;
    }
    search(filters) {
        return this.parkingSpotsService.search(filters);
    }
    findByIds(query) {
        const ids = query.ids.split(',');
        if (ids.length > MAX_BATCH_IDS) {
            throw new common_1.BadRequestException(`ids must not contain more than ${MAX_BATCH_IDS} entries.`);
        }
        return this.parkingSpotsService.findByIds(ids);
    }
    findById(id) {
        return this.parkingSpotsService.findById(id);
    }
    getAvailability(id, query) {
        return this.availabilityService.getAvailability(id, query.from, query.to);
    }
    create(dto, ownerId) {
        if (!ownerId) {
            throw new common_1.BadRequestException('Missing x-user-id header (request must go through the gateway).');
        }
        return this.parkingSpotsService.create(dto, ownerId);
    }
    update(id, dto, _userId) {
        return this.parkingSpotsService.update(id, dto);
    }
    findAllByOwner(id) {
        return this.parkingSpotsService.findAllByOwner(id);
    }
    setStatus(id, dto, userId) {
        return this.parkingSpotsService.setStatus(id, this.requireUserId(userId), dto.status);
    }
    async uploadPhotos(id, files, userId) {
        const ownerId = this.requireUserId(userId);
        if (!files || files.length === 0) {
            throw new common_1.BadRequestException('No se recibió ninguna imagen (campo "files").');
        }
        const urls = await Promise.all(files.map((file) => this.storageService.uploadObject(`parking-spots/${id}/${(0, node_crypto_1.randomUUID)()}.${extensionFor(file.mimetype)}`, file.buffer, file.mimetype)));
        return this.parkingSpotsService.addPhotos(id, ownerId, urls);
    }
    async getPhotos(id) {
        const spot = await this.parkingSpotsService.findById(id);
        return { photos: spot.photos };
    }
    async deletePhoto(id, dto, userId) {
        const ownerId = this.requireUserId(userId);
        const updated = await this.parkingSpotsService.removePhoto(id, ownerId, dto.url);
        await this.storageService.deleteObject(dto.url);
        return updated;
    }
    reorderPhotos(id, dto, userId) {
        const ownerId = this.requireUserId(userId);
        return this.parkingSpotsService.reorderPhotos(id, ownerId, dto.photos);
    }
    async remove(id, userId) {
        const ownerId = this.requireUserId(userId);
        const deletedPhotos = await this.parkingSpotsService.remove(id, ownerId);
        await Promise.all(deletedPhotos.map((url) => this.storageService.deleteObject(url)));
        return { message: 'Cochera eliminada.' };
    }
    async removeAllForOwner(ownerId) {
        const deletedPhotos = await this.parkingSpotsService.removeAllForOwner(ownerId);
        await Promise.all(deletedPhotos.map((url) => this.storageService.deleteObject(url)));
        return { message: 'Cocheras eliminadas.' };
    }
};
exports.ParkingSpotsController = ParkingSpotsController;
__decorate([
    (0, common_1.Get)('parking-spots/search'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_parking_spot_dto_1.SearchParkingSpotDto]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('parking-spots'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [parking_spots_batch_query_dto_1.ParkingSpotsBatchQueryDto]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "findByIds", null);
__decorate([
    (0, common_1.Get)('parking-spots/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "findById", null);
__decorate([
    (0, common_1.Get)('parking-spots/:id/availability'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, availability_query_dto_1.AvailabilityQueryDto]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "getAvailability", null);
__decorate([
    (0, common_1.Post)('parking-spots'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_parking_spot_dto_1.CreateParkingSpotDto, String]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('parking-spots/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_parking_spot_dto_1.UpdateParkingSpotDto, String]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('users/:id/parking-spots'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "findAllByOwner", null);
__decorate([
    (0, common_1.Patch)('parking-spots/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_status_dto_1.UpdateStatusDto, String]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "setStatus", null);
__decorate([
    (0, common_1.Post)('parking-spots/:id/photos'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', parking_spots_service_1.MAX_PHOTOS, {
        limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
        fileFilter: (_req, file, callback) => {
            if (!ALLOWED_PHOTO_TYPES.has(file.mimetype)) {
                callback(new common_1.BadRequestException('Formato no permitido. Usá JPEG, PNG o WEBP.'), false);
                return;
            }
            callback(null, true);
        },
    })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, String]),
    __metadata("design:returntype", Promise)
], ParkingSpotsController.prototype, "uploadPhotos", null);
__decorate([
    (0, common_1.Get)('parking-spots/:id/photos'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ParkingSpotsController.prototype, "getPhotos", null);
__decorate([
    (0, common_1.Delete)('parking-spots/:id/photos'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, delete_photo_dto_1.DeletePhotoDto, String]),
    __metadata("design:returntype", Promise)
], ParkingSpotsController.prototype, "deletePhoto", null);
__decorate([
    (0, common_1.Put)('parking-spots/:id/photos/order'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reorder_photos_dto_1.ReorderPhotosDto, String]),
    __metadata("design:returntype", void 0)
], ParkingSpotsController.prototype, "reorderPhotos", null);
__decorate([
    (0, common_1.Delete)('parking-spots/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ParkingSpotsController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)('users/:ownerId/parking-spots'),
    __param(0, (0, common_1.Param)('ownerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ParkingSpotsController.prototype, "removeAllForOwner", null);
exports.ParkingSpotsController = ParkingSpotsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [parking_spots_service_1.ParkingSpotsService,
        availability_service_1.AvailabilityService,
        storage_service_1.StorageService])
], ParkingSpotsController);
//# sourceMappingURL=parking-spots.controller.js.map