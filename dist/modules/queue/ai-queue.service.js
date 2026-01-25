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
var AiQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiQueueService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const ai_service_1 = require("../ai/ai.service");
const meals_service_1 = require("../meals/meals.service");
const queue_types_1 = require("./queue.types");
const client_1 = require("@prisma/client");
const MAX_RETRIES = 3;
const JOB_EXPIRY_HOURS = 24;
const PROCESSING_INTERVAL_MS = 2000;
const MAX_CONCURRENT_JOBS = 3;
let AiQueueService = AiQueueService_1 = class AiQueueService {
    prisma;
    aiService;
    mealsService;
    logger = new common_1.Logger(AiQueueService_1.name);
    processingInterval = null;
    activeJobs = new Set();
    isShuttingDown = false;
    constructor(prisma, aiService, mealsService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.mealsService = mealsService;
    }
    onModuleInit() {
        this.startProcessor();
        this.logger.log('AI Queue processor started');
    }
    onModuleDestroy() {
        this.stopProcessor();
    }
    async createJob(input) {
        const job = await this.prisma.ai_analysis_jobs.create({
            data: {
                userId: input.userId,
                imageUrl: input.imageUrl,
                thumbnailUrl: input.thumbnailUrl,
                imageBase64: input.imageBase64,
                mealType: input.mealType || client_1.MealType.SNACK,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + JOB_EXPIRY_HOURS * 60 * 60 * 1000),
            },
        });
        this.logger.log(`AI analysis job created: ${job.id} for user: ${input.userId}`);
        return {
            jobId: job.id,
            status: queue_types_1.JobStatus.PENDING,
            message: 'AI analysis job created successfully',
        };
    }
    async getJob(jobId, userId) {
        const job = await this.prisma.ai_analysis_jobs.findUnique({
            where: { id: jobId },
        });
        if (!job || job.userId !== userId) {
            return null;
        }
        return {
            id: job.id,
            status: job.status,
            imageUrl: job.imageUrl,
            thumbnailUrl: job.thumbnailUrl,
            analysisResult: job.analysisResult,
            mealId: job.mealId || undefined,
            error: job.error || undefined,
            retryCount: job.retryCount,
            createdAt: job.createdAt,
            startedAt: job.startedAt || undefined,
            completedAt: job.completedAt || undefined,
        };
    }
    async getUserJobs(userId, limit = 10) {
        const jobs = await this.prisma.ai_analysis_jobs.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return jobs.map(job => ({
            id: job.id,
            status: job.status,
            imageUrl: job.imageUrl,
            thumbnailUrl: job.thumbnailUrl,
            analysisResult: job.analysisResult,
            mealId: job.mealId || undefined,
            error: job.error || undefined,
            retryCount: job.retryCount,
            createdAt: job.createdAt,
            startedAt: job.startedAt || undefined,
            completedAt: job.completedAt || undefined,
        }));
    }
    startProcessor() {
        this.processingInterval = setInterval(() => {
            this.processPendingJobs();
        }, PROCESSING_INTERVAL_MS);
    }
    stopProcessor() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
            this.logger.log('AI Queue processor stopped');
        }
    }
    async processPendingJobs() {
        if (this.isShuttingDown)
            return;
        if (this.activeJobs.size >= MAX_CONCURRENT_JOBS) {
            return;
        }
        try {
            const jobs = await this.prisma.$queryRaw `
        SELECT id, "userId", "imageBase64"
        FROM ai_analysis_jobs
        WHERE "status" = 'PENDING'
          AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
        ORDER BY "createdAt" ASC
        LIMIT ${MAX_CONCURRENT_JOBS - this.activeJobs.size}
        FOR UPDATE SKIP LOCKED
      `;
            for (const job of jobs) {
                if (this.activeJobs.has(job.id))
                    continue;
                this.activeJobs.add(job.id);
                this.processJob(job.id).finally(() => {
                    this.activeJobs.delete(job.id);
                });
            }
        }
        catch (error) {
            this.logger.error('Error fetching pending jobs:', error);
        }
    }
    async processJob(jobId) {
        const startTime = Date.now();
        try {
            await this.prisma.ai_analysis_jobs.update({
                where: { id: jobId },
                data: {
                    status: 'PROCESSING',
                    startedAt: new Date(),
                },
            });
            const job = await this.prisma.ai_analysis_jobs.findUnique({
                where: { id: jobId },
            });
            if (!job) {
                this.logger.error(`Job ${jobId} not found`);
                return;
            }
            this.logger.debug(`Processing AI analysis job: ${jobId}`);
            const analysis = await this.aiService.analyzeFoodImage(job.imageBase64);
            const meal = await this.mealsService.create(job.userId, {
                imageUrl: job.imageUrl,
                thumbnailUrl: job.thumbnailUrl,
                analysis,
                mealType: job.mealType,
            });
            await this.prisma.ai_analysis_jobs.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    analysisResult: analysis,
                    mealId: meal.id,
                    completedAt: new Date(),
                },
            });
            const duration = Date.now() - startTime;
            this.logger.log(`AI analysis job ${jobId} completed in ${duration}ms`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const currentJob = await this.prisma.ai_analysis_jobs.findUnique({
                where: { id: jobId },
                select: { retryCount: true },
            });
            const newRetryCount = (currentJob?.retryCount || 0) + 1;
            if (newRetryCount >= MAX_RETRIES) {
                await this.prisma.ai_analysis_jobs.update({
                    where: { id: jobId },
                    data: {
                        status: 'FAILED',
                        error: errorMessage,
                        retryCount: newRetryCount,
                        completedAt: new Date(),
                    },
                });
                this.logger.error(`AI analysis job ${jobId} failed after ${MAX_RETRIES} retries: ${errorMessage}`);
            }
            else {
                await this.prisma.ai_analysis_jobs.update({
                    where: { id: jobId },
                    data: {
                        status: 'PENDING',
                        error: errorMessage,
                        retryCount: newRetryCount,
                    },
                });
                const delayMs = Math.pow(2, newRetryCount) * 1000;
                this.logger.warn(`AI analysis job ${jobId} failed (attempt ${newRetryCount}/${MAX_RETRIES}), retrying in ${delayMs}ms: ${errorMessage}`);
            }
        }
    }
    async cleanupExpiredJobs() {
        const result = await this.prisma.ai_analysis_jobs.deleteMany({
            where: {
                status: 'COMPLETED',
                completedAt: {
                    lt: new Date(Date.now() - JOB_EXPIRY_HOURS * 60 * 60 * 1000),
                },
            },
        });
        if (result.count > 0) {
            this.logger.log(`Cleaned up ${result.count} expired AI analysis jobs`);
        }
    }
};
exports.AiQueueService = AiQueueService;
exports.AiQueueService = AiQueueService = AiQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AiService,
        meals_service_1.MealsService])
], AiQueueService);
//# sourceMappingURL=ai-queue.service.js.map