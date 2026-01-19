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
const nutrition_service_1 = require("./nutrition.service");
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
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NutritionController.prototype, "getDaily", null);
__decorate([
    (0, common_1.Get)('weekly'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], NutritionController.prototype, "getWeekly", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NutritionController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('averages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NutritionController.prototype, "getAverages", null);
exports.NutritionController = NutritionController = __decorate([
    (0, common_1.Controller)('nutrition'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [nutrition_service_1.NutritionService])
], NutritionController);
//# sourceMappingURL=nutrition.controller.js.map