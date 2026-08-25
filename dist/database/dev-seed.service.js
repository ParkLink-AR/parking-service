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
var DevSeedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevSeedService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const parking_spot_entity_1 = require("../parking-spots/entities/parking-spot.entity");
const parking_spot_schedule_entity_1 = require("../parking-spots/entities/parking-spot-schedule.entity");
const MOCK_OWNER_ID = '00000000-0000-0000-0000-0000000000f1';
const SEED_SPOTS = [
    {
        id: '00000000-0000-0000-0000-0000000000a1',
        title: 'Cochera Cabildo 2980',
        address: 'Av. Cabildo 2980, Belgrano, CABA',
        lat: -34.5651,
        lng: -58.4557,
        pricePerHour: 900,
        covered: true,
        schedule: [0, 1, 2, 3, 4].map((dayOfWeek) => ({ dayOfWeek, startHour: 8, endHour: 22 })),
    },
    {
        id: '00000000-0000-0000-0000-0000000000a2',
        title: 'Cochera Cabildo 3050',
        address: 'Av. Cabildo 3050, Belgrano, CABA',
        lat: -34.5639,
        lng: -58.4551,
        pricePerHour: 650,
        covered: false,
        schedule: [0, 1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, startHour: 7, endHour: 23 })),
    },
];
let DevSeedService = DevSeedService_1 = class DevSeedService {
    constructor(parkingSpotRepo, scheduleRepo) {
        this.parkingSpotRepo = parkingSpotRepo;
        this.scheduleRepo = scheduleRepo;
        this.logger = new common_1.Logger(DevSeedService_1.name);
    }
    async onModuleInit() {
        if (process.env.SEED_DEV_DATA !== 'true')
            return;
        for (const seed of SEED_SPOTS) {
            const exists = await this.parkingSpotRepo.exists({ where: { id: seed.id } });
            if (exists)
                continue;
            const spot = this.parkingSpotRepo.create({
                id: seed.id,
                ownerId: MOCK_OWNER_ID,
                title: seed.title,
                address: seed.address,
                pricePerHour: seed.pricePerHour,
                covered: seed.covered,
                rules: [],
                status: parking_spot_entity_1.ParkingSpotStatus.ACTIVE,
                location: { type: 'Point', coordinates: [seed.lng, seed.lat] },
                schedule: seed.schedule.map((entry) => this.scheduleRepo.create(entry)),
            });
            await this.parkingSpotRepo.save(spot);
        }
        this.logger.log(`Dev seed OK (${SEED_SPOTS.length} cocheras de prueba cerca de Cabildo 3000).`);
    }
};
exports.DevSeedService = DevSeedService;
exports.DevSeedService = DevSeedService = DevSeedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(parking_spot_entity_1.ParkingSpot)),
    __param(1, (0, typeorm_1.InjectRepository)(parking_spot_schedule_entity_1.ParkingSpotSchedule)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], DevSeedService);
//# sourceMappingURL=dev-seed.service.js.map