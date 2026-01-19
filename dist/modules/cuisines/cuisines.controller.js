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
const cuisines_service_1 = require("./cuisines.service");
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CuisinesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('unlocked'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CuisinesController.prototype, "findUnlocked", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CuisinesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':name'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CuisinesController.prototype, "findOne", null);
exports.CuisinesController = CuisinesController = __decorate([
    (0, common_1.Controller)('cuisines'),
    __metadata("design:paramtypes", [cuisines_service_1.CuisinesService])
], CuisinesController);
//# sourceMappingURL=cuisines.controller.js.map