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
exports.MealsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const meals_service_1 = require("./meals.service");
const create_meal_dto_1 = require("./dto/create-meal.dto");
const update_meal_dto_1 = require("./dto/update-meal.dto");
const meal_response_dto_1 = require("./dto/meal-response.dto");
const meal_query_dto_1 = require("./dto/meal-query.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const response_dto_1 = require("../../common/dto/response.dto");
let MealsController = class MealsController {
    mealsService;
    constructor(mealsService) {
        this.mealsService = mealsService;
    }
    async findAll(userId, query) {
        return this.mealsService.findAll(userId, query);
    }
    async getToday(userId) {
        return this.mealsService.getToday(userId);
    }
    async getByDate(userId, dateStr) {
        const date = new Date(dateStr);
        return this.mealsService.getByDate(userId, date);
    }
    async getByDishName(userId, dishName) {
        return this.mealsService.getByDishName(userId, decodeURIComponent(dishName));
    }
    async findOne(userId, id) {
        return this.mealsService.findOne(userId, id);
    }
    async create(userId, dto) {
        return this.mealsService.create(userId, dto);
    }
    async update(userId, id, dto) {
        return this.mealsService.update(userId, id, dto);
    }
    async remove(userId, id) {
        await this.mealsService.remove(userId, id);
        return new response_dto_1.SuccessResponse(null, 'Meal deleted successfully');
    }
};
exports.MealsController = MealsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: '获取餐食列表',
        description: '获取当前用户的餐食列表，支持分页和筛选',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: meal_response_dto_1.PaginatedMealsDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, meal_query_dto_1.MealQueryDto]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('today'),
    (0, swagger_1.ApiOperation)({
        summary: '获取今日餐食',
        description: '获取当前用户今天的所有餐食记录',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: [meal_response_dto_1.MealResponseDto],
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "getToday", null);
__decorate([
    (0, common_1.Get)('by-date'),
    (0, swagger_1.ApiOperation)({
        summary: '按日期获取餐食',
        description: '获取指定日期的所有餐食记录',
    }),
    (0, swagger_1.ApiQuery)({
        name: 'date',
        description: '日期 (YYYY-MM-DD 格式)',
        example: '2024-01-15',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: [meal_response_dto_1.MealResponseDto],
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '日期格式错误',
        schema: {
            example: {
                statusCode: 400,
                message: 'Invalid date format',
                code: 'BAD_REQUEST',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "getByDate", null);
__decorate([
    (0, common_1.Get)('by-dish/:dishName'),
    (0, swagger_1.ApiOperation)({
        summary: '按菜品名获取餐食',
        description: '获取指定菜品名称的所有餐食记录',
    }),
    (0, swagger_1.ApiParam)({
        name: 'dishName',
        description: '菜品名称 (URL 编码)',
        example: '宫保鸡丁',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: [meal_response_dto_1.MealResponseDto],
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('dishName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "getByDishName", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: '获取单个餐食',
        description: '根据 ID 获取指定餐食的详细信息',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: '餐食 ID',
        example: 'cm1234567890',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: meal_response_dto_1.MealResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '餐食不存在',
        schema: {
            example: {
                statusCode: 404,
                message: 'Meal not found',
                code: 'NOT_FOUND',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: '创建餐食',
        description: '创建新的餐食记录',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '创建成功',
        type: meal_response_dto_1.MealResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '请求参数错误',
        schema: {
            example: {
                statusCode: 400,
                message: 'Bad Request',
                code: 'BAD_REQUEST',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_meal_dto_1.CreateMealDto]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: '更新餐食',
        description: '更新指定餐食的信息',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: '餐食 ID',
        example: 'cm1234567890',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '更新成功',
        type: meal_response_dto_1.MealResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '餐食不存在',
        schema: {
            example: {
                statusCode: 404,
                message: 'Meal not found',
                code: 'NOT_FOUND',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_meal_dto_1.UpdateMealDto]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: '删除餐食',
        description: '删除指定的餐食记录',
    }),
    (0, swagger_1.ApiParam)({
        name: 'id',
        description: '餐食 ID',
        example: 'cm1234567890',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '删除成功',
        type: response_dto_1.SuccessResponse,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '餐食不存在',
        schema: {
            example: {
                statusCode: 404,
                message: 'Meal not found',
                code: 'NOT_FOUND',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MealsController.prototype, "remove", null);
exports.MealsController = MealsController = __decorate([
    (0, swagger_1.ApiTags)('Meals'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('meals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [meals_service_1.MealsService])
], MealsController);
//# sourceMappingURL=meals.controller.js.map