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
exports.NutritionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const nutrition_service_1 = require("./nutrition.service");
const nutrition_response_dto_1 = require("./dto/nutrition-response.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let NutritionController = class NutritionController {
    nutritionService;
    constructor(nutritionService) {
        this.nutritionService = nutritionService;
    }
    async getDaily(userId, dateStr) {
        const date = dateStr ? new Date(dateStr) : undefined;
        return this.nutritionService.getDaily(userId, date);
    }
    async getWeekly(userId, startDateStr, endDateStr) {
        const startDate = startDateStr ? new Date(startDateStr) : undefined;
        const endDate = endDateStr ? new Date(endDateStr) : undefined;
        return this.nutritionService.getWeekly(userId, startDate, endDate);
    }
    async getSummary(userId, period = 'week') {
        return this.nutritionService.getSummary(userId, period);
    }
    async getAverages(userId, period = 'week') {
        return this.nutritionService.getAverages(userId, period);
    }
};
exports.NutritionController = NutritionController;
__decorate([
    (0, common_1.Get)('daily'),
    (0, swagger_1.ApiOperation)({
        summary: '获取每日营养数据',
        description: '获取指定日期的营养摄入数据，包括卡路里、蛋白质、碳水化合物、脂肪等',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'date',
        description: '日期 (YYYY-MM-DD 格式，不传则返回今天的数据)',
        required: false,
        example: '2024-01-15',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: nutrition_response_dto_1.DailyNutritionDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NutritionController.prototype, "getDaily", null);
__decorate([
    (0, common_1.Get)('weekly'),
    (0, swagger_1.ApiOperation)({
        summary: '获取营养趋势',
        description: '获取指定时间范围内的营养摄入趋势数据',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'startDate',
        description: '开始日期 (YYYY-MM-DD 格式，不传则使用最近7天)',
        required: false,
        example: '2024-01-01',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'endDate',
        description: '结束日期 (YYYY-MM-DD 格式)',
        required: false,
        example: '2024-01-07',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: nutrition_response_dto_1.WeeklyTrendsDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], NutritionController.prototype, "getWeekly", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({
        summary: '获取营养汇总',
        description: '获取指定时间段内的营养摄入汇总统计',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        description: '统计周期',
        required: false,
        enum: ['week', 'month', 'year', 'all'],
        example: 'week',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: nutrition_response_dto_1.NutritionSummaryDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NutritionController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('averages'),
    (0, swagger_1.ApiOperation)({
        summary: '获取平均营养摄入',
        description: '获取指定周期内的平均营养摄入数据',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'period',
        description: '统计周期',
        required: false,
        enum: ['day', 'week', 'month', 'year'],
        example: 'week',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: nutrition_response_dto_1.AverageNutritionDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NutritionController.prototype, "getAverages", null);
exports.NutritionController = NutritionController = __decorate([
    (0, swagger_1.ApiTags)('Nutrition'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('nutrition'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [nutrition_service_1.NutritionService])
], NutritionController);
//# sourceMappingURL=nutrition.controller.js.map