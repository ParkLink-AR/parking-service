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
exports.FavoritesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const favorite_entity_1 = require("./entities/favorite.entity");
const parking_spots_service_1 = require("../parking-spots/parking-spots.service");
let FavoritesService = class FavoritesService {
    constructor(favoriteRepo, parkingSpotsService) {
        this.favoriteRepo = favoriteRepo;
        this.parkingSpotsService = parkingSpotsService;
    }
    async add(userId, parkingSpotId) {
        await this.parkingSpotsService.findById(parkingSpotId);
        await this.favoriteRepo
            .createQueryBuilder()
            .insert()
            .into(favorite_entity_1.Favorite)
            .values({ userId, parkingSpotId })
            .orIgnore()
            .execute();
    }
    async remove(userId, parkingSpotId) {
        await this.favoriteRepo.delete({ userId, parkingSpotId });
    }
    async listIds(userId) {
        const favorites = await this.favoriteRepo.find({ where: { userId } });
        return favorites.map((f) => f.parkingSpotId);
    }
    async listSpots(userId) {
        const ids = await this.listIds(userId);
        const results = await Promise.allSettled(ids.map((id) => this.parkingSpotsService.findById(id)));
        return results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value);
    }
};
exports.FavoritesService = FavoritesService;
exports.FavoritesService = FavoritesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(favorite_entity_1.Favorite)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        parking_spots_service_1.ParkingSpotsService])
], FavoritesService);
//# sourceMappingURL=favorites.service.js.map