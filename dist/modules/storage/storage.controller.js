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
var StorageController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_express_1 = require("@nestjs/platform-express");
const storage_service_1 = require("./storage.service");
const ai_service_1 = require("../ai/ai.service");
const meals_service_1 = require("../meals/meals.service");
const users_service_1 = require("../users/users.service");
const ai_queue_service_1 = require("../queue/ai-queue.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const response_dto_1 = require("../../common/dto/response.dto");
let StorageController = StorageController_1 = class StorageController {
    storageService;
    aiService;
    mealsService;
    usersService;
    aiQueueService;
    logger = new common_1.Logger(StorageController_1.name);
    constructor(storageService, aiService, mealsService, usersService, aiQueueService) {
        this.storageService = storageService;
        this.aiService = aiService;
        this.mealsService = mealsService;
        this.usersService = usersService;
        this.aiQueueService = aiQueueService;
    }
    async uploadImage(userId, file) {
        return this.storageService.uploadImage(userId, file);
    }
    async uploadWithAnalysisAsync(userId, file) {
        try {
            this.logger.log(`uploadWithAnalysisAsync called, userId: ${userId}`);
            const quota = await this.usersService.checkAnalysisQuota(userId);
            if (!quota.allowed) {
                this.logger.warn(`quota exceeded for user ${userId}, limit: ${quota.limit}`);
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
            this.logger.debug('uploading image...');
            const uploadResult = await this.storageService.uploadImage(userId, file);
            this.logger.debug(`upload result: ${JSON.stringify(uploadResult)}`);
            const imageBase64 = this.storageService.fileToBase64(file);
            this.logger.debug(`image converted to base64, length: ${imageBase64?.length}`);
            this.logger.debug('creating AI analysis job...');
            const job = await this.aiQueueService.createJob({
                userId,
                imageUrl: uploadResult.url,
                thumbnailUrl: uploadResult.thumbnailUrl,
                imageBase64,
                mealType: 'SNACK',
            });
            this.logger.debug(`AI analysis job created: ${job.jobId}`);
            await this.usersService.incrementAnalysisCount(userId);
            return {
                ...job,
                upload: uploadResult,
            };
        }
        catch (error) {
            this.logger.error('uploadWithAnalysisAsync error:', error);
            throw error;
        }
    }
    async getJobStatus(userId, jobId) {
        const job = await this.aiQueueService.getJob(jobId, userId);
        if (!job) {
            throw new common_1.HttpException({
                statusCode: common_1.HttpStatus.NOT_FOUND,
                message: 'Job not found',
                code: 'NOT_FOUND',
            }, common_1.HttpStatus.NOT_FOUND);
        }
        return job;
    }
    async getUserJobs(userId) {
        const jobs = await this.aiQueueService.getUserJobs(userId);
        return { jobs };
    }
    async uploadWithAnalysis(userId, file) {
        try {
            this.logger.log(`uploadWithAnalysis called, userId: ${userId}`);
            const quota = await this.usersService.checkAnalysisQuota(userId);
            this.logger.debug(`quota check result: ${JSON.stringify(quota)}`);
            if (!quota.allowed) {
                this.logger.warn(`quota exceeded for user ${userId}, limit: ${quota.limit}`);
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
            this.logger.debug('uploading image...');
            const uploadResult = await this.storageService.uploadImage(userId, file);
            this.logger.debug(`upload result: ${JSON.stringify(uploadResult)}`);
            const imageBase64 = this.storageService.fileToBase64(file);
            this.logger.debug(`image converted to base64, length: ${imageBase64?.length}`);
            this.logger.debug('starting AI analysis...');
            const analysis = await this.aiService.analyzeFoodImage(imageBase64);
            this.logger.debug(`AI analysis completed: ${analysis?.dishes?.[0]?.foodName}`);
            await this.usersService.incrementAnalysisCount(userId);
            this.logger.debug('creating meal record...');
            const meal = await this.mealsService.create(userId, {
                imageUrl: uploadResult.url,
                thumbnailUrl: uploadResult.thumbnailUrl,
                analysis,
                mealType: 'SNACK',
            });
            this.logger.debug(`meal created: ${meal?.id}`);
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
            this.logger.error('uploadWithAnalysis error:', error);
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
    (0, swagger_1.ApiOperation)({
        summary: '上传图片',
        description: '上传图片到 Supabase Storage，返回图片 URL 和缩略图 URL',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '上传成功',
        schema: {
            example: {
                url: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
                thumbnailUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/thumbnails/xxx.jpg',
                path: 'user-id/xxx.jpg',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: '文件格式或大小不符合要求',
        schema: {
            example: {
                statusCode: 400,
                message: 'Invalid file type or size exceeds limit',
                code: 'BAD_REQUEST',
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Post)('upload-with-analysis-async'),
    (0, swagger_1.ApiOperation)({
        summary: '上传图片并 AI 分析（异步）',
        description: '上传图片并异步进行 AI 食物分析，立即返回任务 ID。客户端可使用 /storage/jobs/:jobId 轮询任务状态。此接口不阻塞 HTTP 请求，推荐使用。',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '上传成功，返回任务 ID',
        schema: {
            example: {
                jobId: 'cm1234567890',
                status: 'PENDING',
                message: 'AI analysis job created successfully',
                upload: {
                    url: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
                    thumbnailUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg?thumbnail=true',
                    key: 'user-id/xxx.jpg',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 429,
        description: 'AI 分析配额已用完',
        schema: {
            example: {
                statusCode: 429,
                message: 'Daily AI analysis quota exceeded. Limit: 10, please try again tomorrow.',
                error: 'QUOTA_EXCEEDED',
                quota: {
                    limit: 10,
                    remaining: 0,
                },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadWithAnalysisAsync", null);
__decorate([
    (0, common_1.Get)('jobs/:jobId'),
    (0, swagger_1.ApiOperation)({
        summary: '查询 AI 分析任务状态',
        description: '根据任务 ID 查询 AI 分析的进度和结果',
    }),
    (0, swagger_1.ApiParam)({
        name: 'jobId',
        description: '任务 ID',
        example: 'cm1234567890',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '任务详情',
        schema: {
            example: {
                id: 'cm1234567890',
                status: 'COMPLETED',
                imageUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
                thumbnailUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg?thumbnail=true',
                analysisResult: {
                    dishes: [
                        {
                            foodName: '宫保鸡丁',
                            cuisine: '川菜',
                            nutrition: { calories: 320, protein: 25, fat: 18, carbohydrates: 12 },
                        },
                    ],
                    nutrition: { calories: 320, protein: 25, fat: 18, carbohydrates: 12 },
                },
                mealId: 'cm0987654321',
                retryCount: 0,
                createdAt: '2024-01-15T10:30:00.000Z',
                startedAt: '2024-01-15T10:30:02.000Z',
                completedAt: '2024-01-15T10:30:08.000Z',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '任务不存在',
        schema: {
            example: {
                statusCode: 404,
                message: 'Job not found',
                code: 'NOT_FOUND',
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "getJobStatus", null);
__decorate([
    (0, common_1.Get)('jobs'),
    (0, swagger_1.ApiOperation)({
        summary: '获取用户的 AI 分析任务列表',
        description: '获取当前用户的最近 AI 分析任务',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '任务列表',
        schema: {
            example: {
                jobs: [
                    {
                        id: 'cm1234567890',
                        status: 'COMPLETED',
                        createdAt: '2024-01-15T10:30:00.000Z',
                    },
                ],
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "getUserJobs", null);
__decorate([
    (0, common_1.Post)('upload-with-analysis'),
    (0, swagger_1.ApiOperation)({
        summary: '上传图片并 AI 分析',
        description: '上传图片并进行 AI 食物分析，自动创建餐食记录。注意：此接口会消耗每日 AI 分析配额',
    }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '上传和分析成功，返回完整的餐食记录',
        schema: {
            example: {
                upload: {
                    url: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
                    thumbnailUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/thumbnails/xxx.jpg',
                    path: 'user-id/xxx.jpg',
                },
                analysis: {
                    dishes: [
                        {
                            foodName: '宫保鸡丁',
                            cuisine: '川菜',
                            confidence: 0.95,
                            ingredients: ['鸡胸肉', '花生', '辣椒'],
                            nutrition: { calories: 320, protein: 25, carbs: 12, fat: 18 },
                        },
                    ],
                    summary: '这是一道经典的川菜，以鸡胸肉和花生为主要食材。',
                },
                meal: {
                    id: 'cm1234567890',
                    imageUrl: 'https://xxx.supabase.co/storage/v1/object/public/meal-images/xxx.jpg',
                    mealType: 'SNACK',
                    createdAt: '2024-01-15T10:30:00.000Z',
                },
                quota: {
                    limit: 10,
                    remaining: 9,
                },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 429,
        description: 'AI 分析配额已用完',
        schema: {
            example: {
                statusCode: 429,
                message: 'Daily AI analysis quota exceeded. Limit: 10, please try again tomorrow.',
                error: 'QUOTA_EXCEEDED',
                quota: {
                    limit: 10,
                    remaining: 0,
                },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUser)('userId')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadWithAnalysis", null);
__decorate([
    (0, common_1.Delete)('delete'),
    (0, swagger_1.ApiOperation)({
        summary: '删除文件',
        description: '从 Supabase Storage 删除指定文件',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: '文件存储路径',
                    example: 'user-id/xxx.jpg',
                },
            },
            required: ['key'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '删除成功',
        type: response_dto_1.SuccessResponse,
    }),
    (0, swagger_1.ApiResponse)({
        status: 404,
        description: '文件不存在',
        schema: {
            example: {
                statusCode: 404,
                message: 'File not found',
                code: 'NOT_FOUND',
            },
        },
    }),
    __param(0, (0, common_1.Body)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "deleteFile", null);
__decorate([
    (0, common_1.Post)('presigned-url'),
    (0, swagger_1.ApiOperation)({
        summary: '获取预签名 URL',
        description: '获取用于直接上传文件的预签名 URL，客户端可直接使用此 URL 上传文件',
    }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                filename: {
                    type: 'string',
                    description: '文件名',
                    example: 'photo.jpg',
                },
                type: {
                    type: 'string',
                    description: '文件类型',
                    example: 'image/jpeg',
                },
            },
            required: ['filename', 'type'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: '生成成功',
        schema: {
            example: {
                url: 'https://xxx.supabase.co/storage/v1/object/sign/meal-images/xxx.jpg?token=xxx',
                path: 'user-id/xxx.jpg',
            },
        },
    }),
    __param(0, (0, common_1.Body)('filename')),
    __param(1, (0, common_1.Body)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "getPresignedUrl", null);
exports.StorageController = StorageController = StorageController_1 = __decorate([
    (0, swagger_1.ApiTags)('Storage'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('storage'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [storage_service_1.StorageService,
        ai_service_1.AiService,
        meals_service_1.MealsService,
        users_service_1.UsersService,
        ai_queue_service_1.AiQueueService])
], StorageController);
//# sourceMappingURL=storage.controller.js.map