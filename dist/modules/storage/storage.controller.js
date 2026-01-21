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
exports.StorageController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const storage_service_1 = require("./storage.service");
const ai_service_1 = require("../ai/ai.service");
const meals_service_1 = require("../meals/meals.service");
const users_service_1 = require("../users/users.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const response_dto_1 = require("../../common/dto/response.dto");
let StorageController = class StorageController {
    storageService;
    aiService;
    mealsService;
    usersService;
    constructor(storageService, aiService, mealsService, usersService) {
        this.storageService = storageService;
        this.aiService = aiService;
        this.mealsService = mealsService;
        this.usersService = usersService;
    }
    async uploadImage(userId, file) {
        return this.storageService.uploadImage(userId, file);
    }
    async uploadWithAnalysis(userId, file) {
        try {
            console.log('[StorageController] uploadWithAnalysis called, userId:', userId);
            const quota = await this.usersService.checkAnalysisQuota(userId);
            console.log('[StorageController] quota check result:', quota);
            if (!quota.allowed) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                    message: `Daily AI analysis quota exceeded. Limit: ${quota.limit}, please try again tomorrow.`,
                    error: 'QUOTA_EXCEEDED',
                    quota: {
                        limit: quota.limit,
                        remaining: quota.remaining,
                    },
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            console.log('[StorageController] uploading image...');
            const uploadResult = await this.storageService.uploadImage(userId, file);
            console.log('[StorageController] upload result:', uploadResult);
            const imageBase64 = this.storageService.fileToBase64(file);
            console.log('[StorageController] image converted to base64, length:', imageBase64?.length);
            console.log('[StorageController] starting AI analysis...');
            const analysis = await this.aiService.analyzeFoodImage(imageBase64);
            console.log('[StorageController] AI analysis completed:', analysis?.foodName);
            await this.usersService.incrementAnalysisCount(userId);
            console.log('[StorageController] creating meal record...');
            const meal = await this.mealsService.create(userId, {
                imageUrl: uploadResult.url,
                thumbnailUrl: uploadResult.thumbnailUrl,
                analysis: analysis,
                mealType: 'SNACK',
            });
            console.log('[StorageController] meal created:', meal?.id);
            return {
                upload: uploadResult,
                analysis,
                meal,
                quota: {
                    limit: quota.limit,
                    remaining: quota.remaining - 1,
                },
            };
        }
        catch (error) {
            console.error('[StorageController] uploadWithAnalysis error:', error);
            console.error('[StorageController] error stack:', error?.stack);
            throw error;
        }
    }
    async processAiAnalysis(userId, mealId, imageBase64, uploadResult) {
        try {
            const analysis = await this.aiService.analyzeFoodImage(imageBase64);
            await this.usersService.incrementAnalysisCount(userId);
            await this.mealsService.updateWithAnalysis(mealId, {
                analysis: analysis,
                calories: analysis.nutrition.calories,
                protein: analysis.nutrition.protein,
                fat: analysis.nutrition.fat,
                carbohydrates: analysis.nutrition.carbohydrates,
                price: analysis.foodPrice,
                foodName: analysis.foodName,
                cuisine: analysis.cuisine,
                description: analysis.description,
                historicalOrigins: analysis.historicalOrigins,
            });
            console.log(`AI analysis completed for meal ${mealId}`);
        }
        catch (error) {
            await this.mealsService.markAnalysisFailed(mealId, {
                error: error.message,
                status: 'failed',
            });
            throw error;
        }
    }
    async deleteFile(key) {
        await this.storageService.deleteFile(key);
        return new response_dto_1.SuccessResponse(null, 'File deleted successfully');
    }
    async getPresignedUrl(filename, type) {
        return this.storageService.getPresignedUrl(filename, type);
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Post)('upload-with-analysis'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadWithAnalysis", null);
__decorate([
    (0, common_1.Delete)('delete'),
    __param(0, (0, common_1.Body)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "deleteFile", null);
__decorate([
    (0, common_1.Post)('presigned-url'),
    __param(0, (0, common_1.Body)('filename')),
    __param(1, (0, common_1.Body)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "getPresignedUrl", null);
exports.StorageController = StorageController = __decorate([
    (0, common_1.Controller)('storage'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [storage_service_1.StorageService,
        ai_service_1.AiService,
        meals_service_1.MealsService,
        users_service_1.UsersService])
], StorageController);
//# sourceMappingURL=storage.controller.js.map