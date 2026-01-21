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
exports.CuisinesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cuisines_service_1 = require("./cuisines.service");
const cuisine_response_dto_1 = require("./dto/cuisine-response.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const public_decorator_1 = require("../../common/decorators/public.decorator");
let CuisinesController = class CuisinesController {
    cuisinesService;
    constructor(cuisinesService) {
        this.cuisinesService = cuisinesService;
    }
    async findAll() {
        return this.cuisinesService.findAll();
    }
    async findUnlocked(userId) {
        return this.cuisinesService.findUnlocked(userId);
    }
    async getStats(userId) {
        return this.cuisinesService.getStats(userId);
    }
    async findOne(userId, name) {
        return this.cuisinesService.findOne(userId, name);
    }
};
exports.CuisinesController = CuisinesController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: '获取所有菜系列表',
        description: '获取所有可用的菜系配置信息（公开接口，无需认证）',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: [cuisine_response_dto_1.CuisineConfigDto],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CuisinesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('unlocked'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiOperation)({
        summary: '获取用户已解锁的菜系',
        description: '获取当前用户已解锁的所有菜系列表',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: [cuisine_response_dto_1.CuisineUnlockDto],
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '未认证',
        schema: {
            example: {
                statusCode: 401,
                message: 'Unauthorized',
                code: 'UNAUTHORIZED',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CuisinesController.prototype, "findUnlocked", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiOperation)({
        summary: '获取用户菜系统计',
        description: '获取当前用户的菜系统计数据，包括已解锁数量、总数量等',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: cuisine_response_dto_1.CuisineStatsDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '未认证',
        schema: {
            example: {
                statusCode: 401,
                message: 'Unauthorized',
                code: 'UNAUTHORIZED',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CuisinesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':name'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiOperation)({
        summary: '获取菜系详情',
        description: '获取指定菜系的详细信息，包括解锁状态和相关餐食',
    }),
    (0, swagger_1.ApiParam)({
        name: 'name',
        description: '菜系名称',
        example: '川菜',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: cuisine_response_dto_1.CuisineDetailDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '菜系不存在',
        schema: {
            example: {
                statusCode: 404,
                message: 'Cuisine not found',
                code: 'NOT_FOUND',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CuisinesController.prototype, "findOne", null);
exports.CuisinesController = CuisinesController = __decorate([
    (0, swagger_1.ApiTags)('Cuisines'),
    (0, common_1.Controller)('cuisines'),
    __metadata("design:paramtypes", [cuisines_service_1.CuisinesService])
], CuisinesController);
//# sourceMappingURL=cuisines.controller.js.map