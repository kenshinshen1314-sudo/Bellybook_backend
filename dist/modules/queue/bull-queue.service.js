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
var QueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const queue_constants_1 = require("./queue.constants");
const prisma_service_1 = require("../../database/prisma.service");
const client_1 = require("@prisma/client");
let QueueService = QueueService_1 = class QueueService {
    aiAnalysisQueue;
    emailQueue;
    notificationQueue;
    syncQueue;
    webhookQueue;
    cleanupQueue;
    prisma;
    logger = new common_1.Logger(QueueService_1.name);
    constructor(aiAnalysisQueue, emailQueue, notificationQueue, syncQueue, webhookQueue, cleanupQueue, prisma) {
        this.aiAnalysisQueue = aiAnalysisQueue;
        this.emailQueue = emailQueue;
        this.notificationQueue = notificationQueue;
        this.syncQueue = syncQueue;
        this.webhookQueue = webhookQueue;
        this.cleanupQueue = cleanupQueue;
        this.prisma = prisma;
    }
    async addAiAnalysisJob(data, options) {
        let priority = options?.priority;
        if (priority === undefined) {
            priority = await this.getUserPriority(data.userId);
        }
        const job = await this.aiAnalysisQueue.add('analyze', data, {
            priority,
            jobId: `ai-analysis-${data.userId}-${Date.now()}`,
        });
        this.logger.log(`AI analysis job created: ${job.id} for user: ${data.userId} (priority: ${priority})`);
        return job.id;
    }
    async addBatchAiAnalysisJob(items) {
        const userId = items[0]?.userId;
        const priority = await this.getUserPriority(userId);
        const job = await this.aiAnalysisQueue.add('analyze-batch', { userId, items }, {
            priority,
            jobId: `ai-batch-${userId}-${Date.now()}`,
        });
        this.logger.log(`Batch AI analysis job created: ${job.id} for user: ${userId} (${items.length} images)`);
        return job.id;
    }
    async getAiAnalysisJob(jobId) {
        const job = await this.aiAnalysisQueue.getJob(jobId);
        if (!job)
            return null;
        const state = await job.getState();
        return {
            jobId: job.id,
            status: state,
            data: job.returnvalue,
            error: job.failedReason,
        };
    }
    async getUserAiJobs(userId, limit = 10) {
        const jobs = await this.aiAnalysisQueue.getJobs(['waiting', 'active', 'completed', 'failed'], 0, limit);
        const userJobs = jobs.filter(job => {
            const data = job.data;
            return data?.userId === userId;
        });
        return Promise.all(userJobs.map(async (job) => {
            const state = await job.getState();
            return {
                jobId: job.id,
                status: state,
                data: job.returnvalue,
                error: job.failedReason,
            };
        }));
    }
    async addEmailJob(data, options) {
        const job = await this.emailQueue.add('send', data, {
            delay: options?.delay || 0,
            priority: options?.priority || 5,
        });
        this.logger.log(`Email job created: ${job.id} to: ${data.to}`);
        return job.id;
    }
    async addBulkEmailJobs(jobs) {
        const bulkJobs = jobs.map(data => ({
            name: 'send',
            data,
        }));
        const addedJobs = await this.emailQueue.addBulk(bulkJobs);
        this.logger.log(`Bulk email jobs created: ${addedJobs.length} emails`);
        return addedJobs.map(job => job.id);
    }
    async addNotificationJob(data) {
        const job = await this.notificationQueue.add('send', data, {
            jobId: `notification-${data.userId}-${Date.now()}`,
        });
        this.logger.log(`Notification job created: ${job.id} for user: ${data.userId}`);
        return job.id;
    }
    async addBroadcastNotification(userIds, notification) {
        const jobs = userIds.map(userId => ({
            name: 'send',
            data: { ...notification, userId },
        }));
        await this.notificationQueue.addBulk(jobs);
        this.logger.log(`Broadcast notification created for ${userIds.length} users`);
    }
    async addSyncJob(data) {
        const job = await this.syncQueue.add('sync', data, {
            jobId: `sync-${data.userId}-${Date.now()}`,
        });
        this.logger.log(`Sync job created: ${job.id} for user: ${data.userId}`);
        return job.id;
    }
    async addWebhookJob(data) {
        const job = await this.webhookQueue.add('send', data, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
        });
        this.logger.log(`Webhook job created: ${job.id} to: ${data.url}`);
        return job.id;
    }
    async addCleanupJob(data) {
        const job = await this.cleanupQueue.add('cleanup', data);
        this.logger.log(`Cleanup job created: ${job.id} type: ${data.type}`);
        return job.id;
    }
    async addRecurringCleanupJob(hour = 2, minute = 0) {
        const cronPattern = `${minute} ${hour} * * *`;
        await this.cleanupQueue.add('cleanup', { type: 'old_logs' }, {
            repeat: { cron: cronPattern },
        });
        this.logger.log(`Recurring cleanup job scheduled at ${hour}:${minute}`);
    }
    async getAllQueueStats() {
        const queues = [
            { name: queue_constants_1.QUEUE_NAMES.AI_ANALYSIS, queue: this.aiAnalysisQueue },
            { name: queue_constants_1.QUEUE_NAMES.EMAIL, queue: this.emailQueue },
            { name: queue_constants_1.QUEUE_NAMES.NOTIFICATION, queue: this.notificationQueue },
            { name: queue_constants_1.QUEUE_NAMES.SYNC, queue: this.syncQueue },
            { name: queue_constants_1.QUEUE_NAMES.WEBHOOK, queue: this.webhookQueue },
            { name: queue_constants_1.QUEUE_NAMES.CLEANUP, queue: this.cleanupQueue },
        ];
        const stats = [];
        for (const { name, queue } of queues) {
            const [waiting, active, completed, failed, delayed] = await Promise.all([
                queue.getWaitingCount(),
                queue.getActiveCount(),
                queue.getCompletedCount(),
                queue.getFailedCount(),
                queue.getDelayedCount(),
            ]);
            const isPaused = await queue.isPaused();
            stats.push({
                queueName: name,
                waiting,
                active,
                completed,
                failed,
                delayed,
                paused: isPaused,
            });
        }
        return stats;
    }
    async clearQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.obliterate({ force: true });
        this.logger.log(`Queue ${queueName} cleared`);
    }
    async pauseQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.pause();
        this.logger.log(`Queue ${queueName} paused`);
    }
    async resumeQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.resume();
        this.logger.log(`Queue ${queueName} resumed`);
    }
    async retryFailedJobs(queueName, limit = 100) {
        const queue = this.getQueue(queueName);
        const failedJobs = await queue.getFailed(0, limit);
        let retried = 0;
        for (const job of failedJobs) {
            await job.retry();
            retried++;
        }
        this.logger.log(`Retried ${retried} failed jobs in queue ${queueName}`);
        return retried;
    }
    getQueue(queueName) {
        switch (queueName) {
            case queue_constants_1.QUEUE_NAMES.AI_ANALYSIS:
                return this.aiAnalysisQueue;
            case queue_constants_1.QUEUE_NAMES.EMAIL:
                return this.emailQueue;
            case queue_constants_1.QUEUE_NAMES.NOTIFICATION:
                return this.notificationQueue;
            case queue_constants_1.QUEUE_NAMES.SYNC:
                return this.syncQueue;
            case queue_constants_1.QUEUE_NAMES.WEBHOOK:
                return this.webhookQueue;
            case queue_constants_1.QUEUE_NAMES.CLEANUP:
                return this.cleanupQueue;
            default:
                throw new Error(`Unknown queue: ${queueName}`);
        }
    }
    async getUserPriority(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { subscriptionTier: true },
        });
        switch (user?.subscriptionTier) {
            case client_1.SubscriptionTier.PRO:
                return 1;
            case client_1.SubscriptionTier.PREMIUM:
                return 5;
            case client_1.SubscriptionTier.FREE:
            default:
                return 10;
        }
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = QueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bull_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.AI_ANALYSIS)),
    __param(1, (0, bull_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.EMAIL)),
    __param(2, (0, bull_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.NOTIFICATION)),
    __param(3, (0, bull_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.SYNC)),
    __param(4, (0, bull_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.WEBHOOK)),
    __param(5, (0, bull_1.InjectQueue)(queue_constants_1.QUEUE_NAMES.CLEANUP)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, Object, Object, prisma_service_1.PrismaService])
], QueueService);
//# sourceMappingURL=bull-queue.service.js.map