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
exports.QueueController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const bull_queue_service_1 = require("./bull-queue.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const admin_guard_1 = require("../../common/guards/admin.guard");
let QueueController = class QueueController {
    queueService;
    constructor(queueService) {
        this.queueService = queueService;
    }
    async getQueueStats() {
        const queues = await this.queueService.getAllQueueStats();
        return { queues };
    }
    async clearQueue(queueName) {
        await this.queueService.clearQueue(queueName);
        return {
            message: `Queue ${queueName} cleared`,
            queueName,
        };
    }
    async pauseQueue(queueName) {
        await this.queueService.pauseQueue(queueName);
        return {
            message: `Queue ${queueName} paused`,
            queueName,
        };
    }
    async resumeQueue(queueName) {
        await this.queueService.resumeQueue(queueName);
        return {
            message: `Queue ${queueName} resumed`,
            queueName,
        };
    }
    async retryFailedJobs(queueName, limit = 100) {
        const retried = await this.queueService.retryFailedJobs(queueName, limit);
        return {
            message: `Retried ${retried} failed jobs`,
            queueName,
            retried,
        };
    }
    async addCleanupJob() {
        const jobId = await this.queueService.addCleanupJob({ type: 'old_logs' });
        return {
            message: 'Cleanup job added',
            jobId,
        };
    }
    async addRecurringCleanupJob(hour = 2, minute = 0) {
        await this.queueService.addRecurringCleanupJob(hour, minute);
        return {
            message: `Recurring cleanup job scheduled at ${hour}:${minute}`,
            hour,
            minute,
        };
    }
};
exports.QueueController = QueueController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({
        summary: '获取队列统计',
        description: '获取所有队列的统计数据（等待、活跃、完成、失败任务数）',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '获取成功',
        type: 'object',
        schema: {
            example: {
                queues: [
                    {
                        queueName: 'ai-analysis',
                        waiting: 5,
                        active: 2,
                        completed: 150,
                        failed: 3,
                        delayed: 0,
                        paused: false,
                    },
                ],
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "getQueueStats", null);
__decorate([
    (0, common_1.Delete)(':queueName/clear'),
    (0, swagger_1.ApiOperation)({
        summary: '清空队列',
        description: '清空指定队列的所有等待和活跃任务',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '清空成功',
        schema: {
            example: {
                message: 'Queue ai-analysis cleared',
                queueName: 'ai-analysis',
            },
        },
    }),
    __param(0, (0, common_1.Param)('queueName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "clearQueue", null);
__decorate([
    (0, common_1.Post)(':queueName/pause'),
    (0, swagger_1.ApiOperation)({
        summary: '暂停队列',
        description: '暂停指定队列，停止处理新任务',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '暂停成功',
        schema: {
            example: {
                message: 'Queue ai-analysis paused',
                queueName: 'ai-analysis',
            },
        },
    }),
    __param(0, (0, common_1.Param)('queueName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "pauseQueue", null);
__decorate([
    (0, common_1.Post)(':queueName/resume'),
    (0, swagger_1.ApiOperation)({
        summary: '恢复队列',
        description: '恢复指定队列，继续处理任务',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '恢复成功',
        schema: {
            example: {
                message: 'Queue ai-analysis resumed',
                queueName: 'ai-analysis',
            },
        },
    }),
    __param(0, (0, common_1.Param)('queueName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "resumeQueue", null);
__decorate([
    (0, common_1.Post)(':queueName/retry'),
    (0, swagger_1.ApiOperation)({
        summary: '重试失败任务',
        description: '重试指定队列中的失败任务',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '重试成功',
        schema: {
            example: {
                message: 'Retried 5 failed jobs',
                queueName: 'ai-analysis',
                retried: 5,
            },
        },
    }),
    __param(0, (0, common_1.Param)('queueName')),
    __param(1, (0, common_1.Param)('limit', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "retryFailedJobs", null);
__decorate([
    (0, common_1.Post)('cleanup'),
    (0, swagger_1.ApiOperation)({
        summary: '添加清理任务',
        description: '添加一个清理任务到队列中',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '任务已添加',
        schema: {
            example: {
                message: 'Cleanup job added',
                jobId: 'cleanup-123',
            },
        },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "addCleanupJob", null);
__decorate([
    (0, common_1.Post)('cleanup/recurring'),
    (0, swagger_1.ApiOperation)({
        summary: '添加定时清理任务',
        description: '添加每天定时执行的清理任务',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: '定时任务已添加',
        schema: {
            example: {
                message: 'Recurring cleanup job scheduled at 2:00',
                hour: 2,
                minute: 0,
            },
        },
    }),
    __param(0, (0, common_1.Param)('hour', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('minute', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "addRecurringCleanupJob", null);
exports.QueueController = QueueController = __decorate([
    (0, swagger_1.ApiTags)('Queue'),
    (0, swagger_1.ApiBearerAuth)('bearer'),
    (0, common_1.Controller)('admin/queue'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [bull_queue_service_1.QueueService])
], QueueController);
//# sourceMappingURL=queue.controller.js.map