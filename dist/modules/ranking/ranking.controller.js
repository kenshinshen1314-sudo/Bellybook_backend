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
exports.RankingController = void 0;
const common_1 = require("@nestjs/common");
const ranking_service_1 = require("./ranking.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const ranking_query_dto_1 = require("./dto/ranking-query.dto");
let RankingController = class RankingController {
    rankingService;
    constructor(rankingService) {
        this.rankingService = rankingService;
    }
    async getCuisineMasters(cuisineName, period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        return this.rankingService.getCuisineMasters(cuisineName, period);
    }
    async getLeaderboard(period = ranking_query_dto_1.RankingPeriod.ALL_TIME, tier) {
        return this.rankingService.getLeaderboard(period, tier);
    }
    async getRankingStats(period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        return this.rankingService.getRankingStats(period);
    }
    async getGourmets(period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        return this.rankingService.getGourmets(period);
    }
    async getDishExperts(period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        return this.rankingService.getDishExperts(period);
    }
};
exports.RankingController = RankingController;
__decorate([
    (0, common_1.Get)('cuisine-masters'),
    __param(0, (0, common_1.Query)('cuisineName')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getCuisineMasters", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('tier')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getRankingStats", null);
__decorate([
    (0, common_1.Get)('gourmets'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getGourmets", null);
__decorate([
    (0, common_1.Get)('dish-experts'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getDishExperts", null);
exports.RankingController = RankingController = __decorate([
    (0, common_1.Controller)('ranking'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ranking_service_1.RankingService])
], RankingController);
//# sourceMappingURL=ranking.controller.js.map