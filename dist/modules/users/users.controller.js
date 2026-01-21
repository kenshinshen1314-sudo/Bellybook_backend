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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const update_profile_dto_1 = require("./dto/update-profile.dto");
const update_settings_dto_1 = require("./dto/update-settings.dto");
const user_response_dto_1 = require("./dto/user-response.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const response_dto_1 = require("../../common/dto/response.dto");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getProfile(userId) {
        return this.usersService.getProfile(userId);
    }
    async updateProfile(userId, dto) {
        return this.usersService.updateProfile(userId, dto);
    }
    async getSettings(userId) {
        return this.usersService.getSettings(userId);
    }
    async updateSettings(userId, dto) {
        return this.usersService.updateSettings(userId, dto);
    }
    async getStats(userId) {
        return this.usersService.getStats(userId);
    }
    async deleteAccount(userId) {
        await this.usersService.deleteAccount(userId);
        return new response_dto_1.SuccessResponse(null, 'Account deleted successfully');
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('profile'),
    (0, swagger_1.ApiOperation)({
        summary: '获取用户资料',
        description: '获取当前登录用户的详细资料信息',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: user_response_dto_1.ProfileResponseDto,
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
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Put)('profile'),
    (0, swagger_1.ApiOperation)({
        summary: '更新用户资料',
        description: '更新当前登录用户的资料信息',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '更新成功',
        type: user_response_dto_1.ProfileResponseDto,
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
    __metadata("design:paramtypes", [String, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, swagger_1.ApiOperation)({
        summary: '获取用户设置',
        description: '获取当前登录用户的设置信息',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: user_response_dto_1.SettingsResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Put)('settings'),
    (0, swagger_1.ApiOperation)({
        summary: '更新用户设置',
        description: '更新当前登录用户的设置信息',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '更新成功',
        type: user_response_dto_1.SettingsResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_settings_dto_1.UpdateSettingsDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: '获取用户统计数据',
        description: '获取当前登录用户的餐饮统计数据，包括餐食数量、解锁菜系等',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: user_response_dto_1.UserStatsDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getStats", null);
__decorate([
    (0, common_1.Delete)('account'),
    (0, swagger_1.ApiOperation)({
        summary: '删除用户账号',
        description: '永久删除当前用户账号及其所有数据，此操作不可恢复',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '删除成功',
        type: response_dto_1.SuccessResponse,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteAccount", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map