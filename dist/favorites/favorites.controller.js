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
exports.FavoritesController = void 0;
const common_1 = require("@nestjs/common");
const favorites_service_1 = require("./favorites.service");
const add_favorite_dto_1 = require("./dto/add-favorite.dto");
let FavoritesController = class FavoritesController {
    constructor(favoritesService) {
        this.favoritesService = favoritesService;
    }
    requireUserId(userId) {
        if (!userId) {
            throw new common_1.BadRequestException('Missing x-user-id header (request must go through the gateway).');
        }
        return userId;
    }
    listSpots(userId) {
        return this.favoritesService.listSpots(this.requireUserId(userId));
    }
    listIds(userId) {
        return this.favoritesService.listIds(this.requireUserId(userId));
    }
    async add(dto, userId) {
        await this.favoritesService.add(this.requireUserId(userId), dto.parkingSpotId);
        return { favorited: true };
    }
    async remove(parkingSpotId, userId) {
        await this.favoritesService.remove(this.requireUserId(userId), parkingSpotId);
        return { favorited: false };
    }
};
exports.FavoritesController = FavoritesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "listSpots", null);
__decorate([
    (0, common_1.Get)('ids'),
    __param(0, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FavoritesController.prototype, "listIds", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [add_favorite_dto_1.AddFavoriteDto, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "add", null);
__decorate([
    (0, common_1.Delete)(':parkingSpotId'),
    __param(0, (0, common_1.Param)('parkingSpotId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FavoritesController.prototype, "remove", null);
exports.FavoritesController = FavoritesController = __decorate([
    (0, common_1.Controller)('favorites'),
    __metadata("design:paramtypes", [favorites_service_1.FavoritesService])
], FavoritesController);
//# sourceMappingURL=favorites.controller.js.map