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
const swagger_1 = require("@nestjs/swagger");
const ranking_optimized_service_1 = require("./ranking-optimized.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const ranking_query_dto_1 = require("./dto/ranking-query.dto");
const ranking_response_dto_1 = require("./dto/ranking-response.dto");
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
    async getCuisineExpertDetail(userId, cuisineName, period = ranking_query_dto_1.RankingPeriod.ALL_TIME) {
        return this.rankingService.getCuisineExpertDetail(userId, cuisineName, period);
    }
    async getAllUsersDishes(period = ranking_query_dto_1.RankingPeriod.WEEKLY) {
        return this.rankingService.getAllUsersDishes(period);
    }
    async getUserUnlockedDishes(userId) {
        return this.rankingService.getUserUnlockedDishes(userId);
    }
};
exports.RankingController = RankingController;
__decorate([
    (0, common_1.Get)('cuisine-masters'),
    (0, swagger_1.ApiOperation)({
        summary: '获取菜系专家榜',
        description: '获取各菜系的专家排行榜，可按菜系名称和时间段筛选',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'cuisineName',
        description: '菜系名称（可选，不传则返回所有菜系的排行）',
        required: false,
        example: '川菜',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        description: '时间段',
        required: false,
        enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
        example: 'ALL_TIME',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: ranking_response_dto_1.CuisineMastersDto,
    }),
    __param(0, (0, common_1.Query)('cuisineName')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getCuisineMasters", null);
__decorate([
    (0, common_1.Get)('leaderboard'),
    (0, swagger_1.ApiOperation)({
        summary: '获取综合排行榜',
        description: '获取用户综合排行榜，基于餐食数量和菜系数量计算得分',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        description: '时间段',
        required: false,
        enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
        example: 'ALL_TIME',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'tier',
        description: '会员等级筛选（可选）',
        required: false,
        enum: ['FREE', 'PREMIUM', 'PRO'],
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: ranking_response_dto_1.LeaderboardDto,
    }),
    __param(0, (0, common_1.Query)('period')),
    __param(1, (0, common_1.Query)('tier')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: '获取排行榜统计数据',
        description: '获取排行榜的统计数据，包括活跃用户数、总餐食数等',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        description: '时间段',
        required: false,
        enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
        example: 'ALL_TIME',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: ranking_response_dto_1.RankingStatsDto,
    }),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getRankingStats", null);
__decorate([
    (0, common_1.Get)('gourmets'),
    (0, swagger_1.ApiOperation)({
        summary: '获取美食家榜',
        description: '统计每个用户尝试过的去重菜系数量，按数量倒序排列',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        description: '时间段',
        required: false,
        enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
        example: 'ALL_TIME',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: ranking_response_dto_1.GourmetsDto,
    }),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getGourmets", null);
__decorate([
    (0, common_1.Get)('dish-experts'),
    (0, swagger_1.ApiOperation)({
        summary: '获取菜品专家榜',
        description: '统计每个用户解锁的去重菜品数量，按数量倒序排列',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        description: '时间段',
        required: false,
        enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
        example: 'ALL_TIME',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: ranking_response_dto_1.DishExpertsDto,
    }),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getDishExperts", null);
__decorate([
    (0, common_1.Get)('cuisine-expert-detail'),
    (0, swagger_1.ApiOperation)({
        summary: '获取菜系专家详情',
        description: '展示指定用户在指定菜系下的所有菜品记录',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'userId',
        description: '用户 ID',
        required: true,
        example: 'cm1234567890',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'cuisineName',
        description: '菜系名称',
        required: true,
        example: '川菜',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        description: '时间段',
        required: false,
        enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
        example: 'ALL_TIME',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: ranking_response_dto_1.CuisineExpertDetailDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '缺少必需参数',
        schema: {
            example: {
                statusCode: 400,
                message: 'userId and cuisineName are required',
                code: 'BAD_REQUEST',
            },
        },
    }),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('cuisineName')),
    __param(2, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getCuisineExpertDetail", null);
__decorate([
    (0, common_1.Get)('all-users-dishes'),
    (0, swagger_1.ApiOperation)({
        summary: '获取所有用户的菜品清单',
        description: '按用户分组，显示每个用户的所有菜品记录',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        description: '时间段',
        required: false,
        enum: ['WEEKLY', 'MONTHLY', 'YEARLY', 'ALL_TIME'],
        example: 'WEEKLY',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: ranking_response_dto_1.AllUsersDishesDto,
    }),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getAllUsersDishes", null);
__decorate([
    (0, common_1.Get)('user-unlocked-dishes'),
    (0, swagger_1.ApiOperation)({
        summary: '获取用户已解锁的菜肴',
        description: '展示用户所有已解锁的菜肴列表',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'userId',
        description: '用户 ID',
        required: true,
        example: 'cm1234567890',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: ranking_response_dto_1.UserUnlockedDishesDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '缺少必需参数',
        schema: {
            example: {
                statusCode: 400,
                message: 'userId is required',
                code: 'BAD_REQUEST',
            },
        },
    }),
    __param(0, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RankingController.prototype, "getUserUnlockedDishes", null);
exports.RankingController = RankingController = __decorate([
    (0, swagger_1.ApiTags)('Ranking'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('ranking'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ranking_optimized_service_1.RankingOptimizedService])
], RankingController);
//# sourceMappingURL=ranking.controller.js.map