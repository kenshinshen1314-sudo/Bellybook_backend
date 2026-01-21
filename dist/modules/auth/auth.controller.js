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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const refresh_token_dto_1 = require("./dto/refresh-token.dto");
const auth_response_dto_1 = require("./dto/auth-response.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const public_decorator_1 = require("../../common/decorators/public.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const response_dto_1 = require("../../common/dto/response.dto");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async register(registerDto) {
        return this.authService.register(registerDto);
    }
    async login(loginDto) {
        return this.authService.login(loginDto);
    }
    async refreshTokens(refreshTokenDto) {
        return this.authService.refreshTokens(refreshTokenDto);
    }
    async logout(userId) {
        await this.authService.logout(userId);
        return new response_dto_1.SuccessResponse(null, 'Logged out successfully');
    }
    async getCurrentUser(userId) {
        return this.authService.getCurrentUser(userId);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({
        summary: '用户注册',
        description: '创建新用户账号，返回访问令牌和刷新令牌',
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '注册成功',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 409,
        description: '用户名或邮箱已存在',
        schema: {
            example: {
                statusCode: 409,
                message: 'Username already exists',
                code: 'CONFLICT',
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({
        summary: '用户登录',
        description: '使用用户名或邮箱登录，返回访问令牌和刷新令牌',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '登录成功',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '用户名或密码错误',
        schema: {
            example: {
                statusCode: 401,
                message: 'Invalid credentials',
                code: 'UNAUTHORIZED',
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiOperation)({
        summary: '刷新令牌',
        description: '使用刷新令牌获取新的访问令牌',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '刷新成功',
        type: auth_response_dto_1.AuthResponseDto,
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: '刷新令牌无效或已过期',
        schema: {
            example: {
                statusCode: 401,
                message: 'Refresh token has expired',
                code: 'UNAUTHORIZED',
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_token_dto_1.RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refreshTokens", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiOperation)({
        summary: '用户登出',
        description: '注销当前用户，使刷新令牌失效',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '登出成功',
        type: response_dto_1.SuccessResponse,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, swagger_1.ApiOperation)({
        summary: '获取当前用户信息',
        description: '根据 JWT 令牌获取当前登录用户的详细信息',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: auth_response_dto_1.UserResponseDto,
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
], AuthController.prototype, "getCurrentUser", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map