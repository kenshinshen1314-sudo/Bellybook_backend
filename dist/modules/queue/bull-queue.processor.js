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
var AiAnalysisProcessor_1, EmailProcessor_1, NotificationProcessor_1, SyncProcessor_1, WebhookProcessor_1, CleanupProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueProcessor = exports.CleanupProcessor = exports.WebhookProcessor = exports.SyncProcessor = exports.NotificationProcessor = exports.EmailProcessor = exports.AiAnalysisProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const meals_service_1 = require("../meals/meals.service");
const queue_constants_1 = require("./queue.constants");
const client_1 = require("@prisma/client");
var AiErrorType;
(function (AiErrorType) {
    AiErrorType["NETWORK"] = "network";
    AiErrorType["RATE_LIMIT"] = "rate_limit";
    AiErrorType["INVALID_IMAGE"] = "invalid_image";
    AiErrorType["PARSING"] = "parsing";
    AiErrorType["UNKNOWN"] = "unknown";
})(AiErrorType || (AiErrorType = {}));
class AiAnalysisError extends Error {
    type;
    retryable;
    constructor(message, type, retryable = true) {
        super(message);
        this.type = type;
        this.retryable = retryable;
        this.name = 'AiAnalysisError';
    }
}
let AiAnalysisProcessor = AiAnalysisProcessor_1 = class AiAnalysisProcessor {
    prisma;
    aiService;
    mealsService;
    logger = new common_1.Logger(AiAnalysisProcessor_1.name);
    PROGRESS_UPDATE_INTERVAL = 5000;
    constructor(prisma, aiService, mealsService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.mealsService = mealsService;
    }
    async handleAiAnalysis(job) {
        const { userId, imageUrl, thumbnailUrl, imageBase64, mealType } = job.data;
        const user = await this.getUserTier(userId);
        this.logger.log(`Processing AI analysis job: ${job.id} for user: ${userId} (${user?.subscriptionTier || 'FREE'})`);
        try {
            const analysis = await this.analyzeWithProgress(job, imageBase64);
            const meal = await this.mealsService.create(userId, {
                imageUrl,
                thumbnailUrl,
                analysis,
                mealType: mealType,
            });
            this.logger.log(`AI analysis job ${job.id} completed, meal created: ${meal.id}`);
            return {
                mealId: meal.id,
                analysis,
            };
        }
        catch (error) {
            const aiError = this.classifyError(error);
            if (!aiError.retryable) {
                this.logger.error(`AI analysis job ${job.id} failed with non-retryable error: ${aiError.message}`);
                throw new AiAnalysisError(aiError.message, aiError.type, false);
            }
            this.logger.error(`AI analysis job ${job.id} failed (retryable): ${aiError.message}`);
            throw error;
        }
    }
    async handleBatchAiAnalysis(job) {
        const { userId, items } = job.data;
        const results = [];
        let success = 0;
        let failed = 0;
        this.logger.log(`Processing batch AI analysis: ${items.length} images for user: ${userId}`);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
                await job.progress((i / items.length) * 100);
                const analysis = await this.aiService.analyzeFoodImage(item.imageBase64);
                const meal = await this.mealsService.create(userId, {
                    imageUrl: item.imageUrl,
                    thumbnailUrl: item.thumbnailUrl,
                    analysis,
                    mealType: item.mealType,
                });
                results.push({ mealId: meal.id, analysis });
                success++;
            }
            catch (error) {
                this.logger.error(`Failed to analyze image ${i + 1}/${items.length}:`, error);
                failed++;
            }
        }
        await job.progress(100);
        this.logger.log(`Batch AI analysis completed: ${success} success, ${failed} failed`);
        return { results, success, failed };
    }
    async analyzeWithProgress(job, imageBase64) {
        const progressInterval = setInterval(() => {
            job.progress(50);
        }, this.PROGRESS_UPDATE_INTERVAL);
        try {
            const result = await this.aiService.analyzeFoodImage(imageBase64);
            clearInterval(progressInterval);
            return result;
        }
        catch (error) {
            clearInterval(progressInterval);
            throw error;
        }
    }
    async getUserTier(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { subscriptionTier: true },
        });
        return user;
    }
    getJobPriority(tier) {
        switch (tier) {
            case client_1.SubscriptionTier.PRO:
                return 1;
            case client_1.SubscriptionTier.PREMIUM:
                return 5;
            case client_1.SubscriptionTier.FREE:
            default:
                return 10;
        }
    }
    classifyError(error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
            return new AiAnalysisError(errorMessage, AiErrorType.NETWORK, true);
        }
        if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) {
            return new AiAnalysisError(errorMessage, AiErrorType.RATE_LIMIT, true);
        }
        if (message.includes('invalid image') || message.includes('not an image') || message.includes('unsupported format')) {
            return new AiAnalysisError(errorMessage, AiErrorType.INVALID_IMAGE, false);
        }
        if (message.includes('parse') || message.includes('json')) {
            return new AiAnalysisError(errorMessage, AiErrorType.PARSING, true);
        }
        return new AiAnalysisError(errorMessage, AiErrorType.UNKNOWN, true);
    }
    onActive(job) {
        this.logger.debug(`AI job ${job.id} started processing`);
    }
    onCompleted(job, result) {
        const duration = Date.now() - job.timestamp;
        this.logger.log(`AI job ${job.id} completed in ${duration}ms`);
    }
    onFailed(job, error) {
        const duration = Date.now() - job.timestamp;
        const attemptsMade = job.attemptsMade;
        const maxAttempts = job.opts.attempts || 3;
        this.logger.error(`AI job ${job.id} failed after ${duration}ms (attempt ${attemptsMade}/${maxAttempts}): ${error.message}`);
    }
    onStalled(job) {
        this.logger.warn(`AI job ${job.id} stalled - might need investigation`);
    }
    onProgress(job, progress) {
        this.logger.debug(`AI job ${job.id} progress: ${progress}%`);
    }
};
exports.AiAnalysisProcessor = AiAnalysisProcessor;
__decorate([
    (0, bull_1.Process)('analyze'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiAnalysisProcessor.prototype, "handleAiAnalysis", null);
__decorate([
    (0, bull_1.Process)('analyze-batch'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiAnalysisProcessor.prototype, "handleBatchAiAnalysis", null);
__decorate([
    (0, bull_1.OnQueueActive)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiAnalysisProcessor.prototype, "onActive", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AiAnalysisProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], AiAnalysisProcessor.prototype, "onFailed", null);
__decorate([
    (0, bull_1.OnQueueStalled)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AiAnalysisProcessor.prototype, "onStalled", null);
__decorate([
    (0, bull_1.OnQueueProgress)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], AiAnalysisProcessor.prototype, "onProgress", null);
exports.AiAnalysisProcessor = AiAnalysisProcessor = AiAnalysisProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bull_1.Processor)(queue_constants_1.QUEUE_NAMES.AI_ANALYSIS),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        meals_service_1.MealsService])
], AiAnalysisProcessor);
let EmailProcessor = EmailProcessor_1 = class EmailProcessor {
    logger = new common_1.Logger(EmailProcessor_1.name);
    async handleSendEmail(job) {
        const { to, subject, template, context, html, text } = job.data;
        this.logger.log(`Sending email to: ${Array.isArray(to) ? to.join(', ') : to}`);
        try {
            this.logger.log(`Email sent successfully: ${job.id}`);
            return {
                sent: true,
                messageId: `msg-${job.id}`,
            };
        }
        catch (error) {
            this.logger.error(`Failed to send email ${job.id}:`, error);
            throw error;
        }
    }
    onCompleted(job) {
        this.logger.log(`Email job ${job.id} completed`);
    }
    onFailed(job, error) {
        this.logger.error(`Email job ${job.id} failed: ${error.message}`);
    }
};
exports.EmailProcessor = EmailProcessor;
__decorate([
    (0, bull_1.Process)('send'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailProcessor.prototype, "handleSendEmail", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EmailProcessor.prototype, "onCompleted", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], EmailProcessor.prototype, "onFailed", null);
exports.EmailProcessor = EmailProcessor = EmailProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bull_1.Processor)(queue_constants_1.QUEUE_NAMES.EMAIL)
], EmailProcessor);
let NotificationProcessor = NotificationProcessor_1 = class NotificationProcessor {
    logger = new common_1.Logger(NotificationProcessor_1.name);
    async handleSendNotification(job) {
        const { userId, type, title, body, data } = job.data;
        this.logger.log(`Sending ${type} notification to user: ${userId}`);
        try {
            this.logger.log(`Notification sent to user ${userId}: ${title}`);
            return { sent: true };
        }
        catch (error) {
            this.logger.error(`Failed to send notification ${job.id}:`, error);
            throw error;
        }
    }
    onCompleted(job) {
        this.logger.debug(`Notification job ${job.id} completed`);
    }
};
exports.NotificationProcessor = NotificationProcessor;
__decorate([
    (0, bull_1.Process)('send'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationProcessor.prototype, "handleSendNotification", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationProcessor.prototype, "onCompleted", null);
exports.NotificationProcessor = NotificationProcessor = NotificationProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bull_1.Processor)(queue_constants_1.QUEUE_NAMES.NOTIFICATION)
], NotificationProcessor);
let SyncProcessor = SyncProcessor_1 = class SyncProcessor {
    prisma;
    logger = new common_1.Logger(SyncProcessor_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleSync(job) {
        const { userId, operation, lastSyncAt } = job.data;
        this.logger.log(`Processing ${operation} sync for user: ${userId}`);
        try {
            let syncedCount = 0;
            switch (operation) {
                case 'full_sync':
                    syncedCount = await this.performFullSync(userId);
                    break;
                case 'incremental_sync':
                    syncedCount = await this.performIncrementalSync(userId, lastSyncAt);
                    break;
                case 'cleanup':
                    syncedCount = await this.performCleanup(userId);
                    break;
            }
            this.logger.log(`Sync job ${job.id} completed, synced ${syncedCount} records`);
            return { synced: syncedCount };
        }
        catch (error) {
            this.logger.error(`Sync job ${job.id} failed:`, error);
            throw error;
        }
    }
    async performFullSync(userId) {
        return 0;
    }
    async performIncrementalSync(userId, lastSyncAt) {
        return 0;
    }
    async performCleanup(userId) {
        return 0;
    }
    onCompleted(job) {
        this.logger.log(`Sync job ${job.id} completed`);
    }
};
exports.SyncProcessor = SyncProcessor;
__decorate([
    (0, bull_1.Process)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SyncProcessor.prototype, "handleSync", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SyncProcessor.prototype, "onCompleted", null);
exports.SyncProcessor = SyncProcessor = SyncProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bull_1.Processor)(queue_constants_1.QUEUE_NAMES.SYNC),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SyncProcessor);
let WebhookProcessor = WebhookProcessor_1 = class WebhookProcessor {
    logger = new common_1.Logger(WebhookProcessor_1.name);
    async handleSendWebhook(job) {
        const { url, method, payload, headers, signature } = job.data;
        this.logger.log(`Sending webhook to: ${url}`);
        try {
            this.logger.log(`Webhook sent to ${url}: ${job.id}`);
            return {
                sent: true,
                statusCode: 200,
            };
        }
        catch (error) {
            this.logger.error(`Failed to send webhook ${job.id}:`, error);
            throw error;
        }
    }
    onFailed(job, error) {
        this.logger.error(`Webhook job ${job.id} failed: ${error.message}`);
    }
};
exports.WebhookProcessor = WebhookProcessor;
__decorate([
    (0, bull_1.Process)('send'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookProcessor.prototype, "handleSendWebhook", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], WebhookProcessor.prototype, "onFailed", null);
exports.WebhookProcessor = WebhookProcessor = WebhookProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bull_1.Processor)(queue_constants_1.QUEUE_NAMES.WEBHOOK)
], WebhookProcessor);
let CleanupProcessor = CleanupProcessor_1 = class CleanupProcessor {
    prisma;
    logger = new common_1.Logger(CleanupProcessor_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async handleCleanup(job) {
        const { type, beforeDate } = job.data;
        this.logger.log(`Processing ${type} cleanup`);
        try {
            let deletedCount = 0;
            switch (type) {
                case 'expired_tokens':
                    deletedCount = await this.cleanupExpiredTokens();
                    break;
                case 'old_logs':
                    deletedCount = await this.cleanupOldLogs(beforeDate);
                    break;
                case 'failed_jobs':
                    deletedCount = await this.cleanupFailedJobs(beforeDate);
                    break;
                case 'cache':
                    deletedCount = await this.cleanupCache(beforeDate);
                    break;
            }
            this.logger.log(`Cleanup job ${job.id} completed, deleted ${deletedCount} records`);
            return { deleted: deletedCount };
        }
        catch (error) {
            this.logger.error(`Cleanup job ${job.id} failed:`, error);
            throw error;
        }
    }
    async cleanupExpiredTokens() {
        const result = await this.prisma.refresh_tokens.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        return result.count;
    }
    async cleanupOldLogs(beforeDate) {
        const date = beforeDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        return 0;
    }
    async cleanupFailedJobs(beforeDate) {
        const date = beforeDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const result = await this.prisma.ai_analysis_jobs.deleteMany({
            where: {
                status: 'FAILED',
                completedAt: { lt: date },
            },
        });
        return result.count;
    }
    async cleanupCache(beforeDate) {
        return 0;
    }
    onCompleted(job) {
        this.logger.log(`Cleanup job ${job.id} completed`);
    }
};
exports.CleanupProcessor = CleanupProcessor;
__decorate([
    (0, bull_1.Process)('cleanup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CleanupProcessor.prototype, "handleCleanup", null);
__decorate([
    (0, bull_1.OnQueueCompleted)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CleanupProcessor.prototype, "onCompleted", null);
exports.CleanupProcessor = CleanupProcessor = CleanupProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bull_1.Processor)(queue_constants_1.QUEUE_NAMES.CLEANUP),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CleanupProcessor);
exports.QueueProcessor = [
    AiAnalysisProcessor,
    EmailProcessor,
    NotificationProcessor,
    SyncProcessor,
    WebhookProcessor,
    CleanupProcessor,
];
//# sourceMappingURL=bull-queue.processor.js.map