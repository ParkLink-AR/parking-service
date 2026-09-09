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
exports.StaysController = void 0;
const common_1 = require("@nestjs/common");
const stays_service_1 = require("./stays.service");
const stay_quote_query_dto_1 = require("./dto/stay-quote-query.dto");
let StaysController = class StaysController {
    constructor(staysService) {
        this.staysService = staysService;
    }
    getQuote(id, query) {
        return this.staysService.getQuote(id, query.startDate, query.unit, query.count);
    }
};
exports.StaysController = StaysController;
__decorate([
    (0, common_1.Get)(':id/stays/quote'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, stay_quote_query_dto_1.StayQuoteQueryDto]),
    __metadata("design:returntype", void 0)
], StaysController.prototype, "getQuote", null);
exports.StaysController = StaysController = __decorate([
    (0, common_1.Controller)('parking-spots'),
    __metadata("design:paramtypes", [stays_service_1.StaysService])
], StaysController);
//# sourceMappingURL=stays.controller.js.map