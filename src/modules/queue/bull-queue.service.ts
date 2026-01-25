/**
 * [BULL QUEUE SERVICE]
 * 统一的任务队列服务
 *
 * 提供所有类型任务的创建、查询、管理接口
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { QUEUE_NAMES, QueueName } from './queue.constants';
import { FoodAnalysisResult } from '../ai/ai-types';
import { PrismaService } from '../../database/prisma.service';
import { SubscriptionTier } from '@prisma/client';

// ============================================================
// 类型定义
// ============================================================

/**
 * AI 分析任务数据
 */
export interface AiAnalysisJobData {
  userId: string;
  imageUrl: string;
  thumbnailUrl: string;
  imageBase64: string;
  mealType?: string;
}

/**
 * 邮件任务数据
 */
export interface EmailJobData {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
}

/**
 * 通知任务数据
 */
export interface NotificationJobData {
  userId: string;
  type: 'meal_reminder' | 'achievement_unlocked' | 'ranking_update' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * 同步任务数据
 */
export interface SyncJobData {
  userId: string;
  operation: 'full_sync' | 'incremental_sync' | 'cleanup';
  lastSyncAt?: Date;
}

/**
 * Webhook 任务数据
 */
export interface WebhookJobData {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  payload: Record<string, any>;
  headers?: Record<string, string>;
  signature?: string;
}

/**
 * 清理任务数据
 */
export interface CleanupJobData {
  type: 'expired_tokens' | 'old_logs' | 'failed_jobs' | 'cache';
  beforeDate?: Date;
}

/**
 * 任务响应
 */
export interface JobResponse {
  jobId: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  data?: any;
  error?: string;
}

/**
 * 队列统计
 */
export interface QueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.AI_ANALYSIS)
    private aiAnalysisQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.NOTIFICATION)
    private notificationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SYNC)
    private syncQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK)
    private webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CLEANUP)
    private cleanupQueue: Queue,
    private prisma: PrismaService,
  ) {}

  // ============================================================
  // AI 分析任务
  // ============================================================

  /**
   * 创建 AI 分析任务（自动优先级）
   * 根据用户等级自动设置优先级
   */
  async addAiAnalysisJob(data: AiAnalysisJobData, options?: { priority?: number }): Promise<string> {
    // 如果未指定优先级，根据用户等级自动设置
    let priority = options?.priority;
    if (priority === undefined) {
      priority = await this.getUserPriority(data.userId);
    }

    const job = await this.aiAnalysisQueue.add('analyze', data, {
      priority,
      jobId: `ai-analysis-${data.userId}-${Date.now()}`,
    });

    this.logger.log(`AI analysis job created: ${job.id} for user: ${data.userId} (priority: ${priority})`);
    return job.id as string;
  }

  /**
   * 批量 AI 分析（多张图片）
   * 适用于用户一次上传多张照片的场景
   */
  async addBatchAiAnalysisJob(
    items: Array<{
      userId: string;
      imageUrl: string;
      thumbnailUrl: string;
      imageBase64: string;
      mealType?: string;
    }>,
  ): Promise<string> {
    // 所有图片属于同一用户，取第一个的用户信息
    const userId = items[0]?.userId;
    const priority = await this.getUserPriority(userId);

    const job = await this.aiAnalysisQueue.add('analyze-batch', { userId, items }, {
      priority,
      jobId: `ai-batch-${userId}-${Date.now()}`,
    });

    this.logger.log(`Batch AI analysis job created: ${job.id} for user: ${userId} (${items.length} images)`);
    return job.id as string;
  }

  /**
   * 获取 AI 分析任务状态
   */
  async getAiAnalysisJob(jobId: string): Promise<JobResponse | null> {
    const job = await this.aiAnalysisQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      jobId: job.id as string,
      status: state as any,
      data: job.returnvalue,
      error: job.failedReason,
    };
  }

  /**
   * 批量获取用户的 AI 分析任务状态
   */
  async getUserAiJobs(userId: string, limit: number = 10): Promise<JobResponse[]> {
    const jobs = await this.aiAnalysisQueue.getJobs([ 'waiting', 'active', 'completed', 'failed' ], 0, limit);

    // 过滤出该用户的任务
    const userJobs = jobs.filter(job => {
      const data = job.data as AiAnalysisJobData;
      return data?.userId === userId;
    });

    return Promise.all(userJobs.map(async (job) => {
      const state = await job.getState();
      return {
        jobId: job.id as string,
        status: state as any,
        data: job.returnvalue,
        error: job.failedReason,
      };
    }));
  }

  // ============================================================
  // 邮件任务
  // ============================================================

  /**
   * 添加邮件任务
   */
  async addEmailJob(data: EmailJobData, options?: { delay?: number; priority?: number }): Promise<string> {
    const job = await this.emailQueue.add('send', data, {
      delay: options?.delay || 0,
      priority: options?.priority || 5,
    });

    this.logger.log(`Email job created: ${job.id} to: ${data.to}`);
    return job.id as string;
  }

  /**
   * 批量添加邮件任务
   */
  async addBulkEmailJobs(jobs: EmailJobData[]): Promise<string[]> {
    const bulkJobs = jobs.map(data => ({
      name: 'send',
      data,
    }));

    const addedJobs = await this.emailQueue.addBulk(bulkJobs);
    this.logger.log(`Bulk email jobs created: ${addedJobs.length} emails`);
    return addedJobs.map(job => job.id as string);
  }

  // ============================================================
  // 通知任务
  // ============================================================

  /**
   * 添加通知任务
   */
  async addNotificationJob(data: NotificationJobData): Promise<string> {
    const job = await this.notificationQueue.add('send', data, {
      jobId: `notification-${data.userId}-${Date.now()}`,
    });

    this.logger.log(`Notification job created: ${job.id} for user: ${data.userId}`);
    return job.id as string;
  }

  /**
   * 广播通知（多个用户）
   */
  async addBroadcastNotification(userIds: string[], notification: Omit<NotificationJobData, 'userId'>): Promise<void> {
    const jobs = userIds.map(userId => ({
      name: 'send',
      data: { ...notification, userId },
    }));

    await this.notificationQueue.addBulk(jobs);
    this.logger.log(`Broadcast notification created for ${userIds.length} users`);
  }

  // ============================================================
  // 同步任务
  // ============================================================

  /**
   * 添加同步任务
   */
  async addSyncJob(data: SyncJobData): Promise<string> {
    const job = await this.syncQueue.add('sync', data, {
      jobId: `sync-${data.userId}-${Date.now()}`,
    });

    this.logger.log(`Sync job created: ${job.id} for user: ${data.userId}`);
    return job.id as string;
  }

  // ============================================================
  // Webhook 任务
  // ============================================================

  /**
   * 添加 Webhook 任务
   */
  async addWebhookJob(data: WebhookJobData): Promise<string> {
    const job = await this.webhookQueue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    this.logger.log(`Webhook job created: ${job.id} to: ${data.url}`);
    return job.id as string;
  }

  // ============================================================
  // 清理任务
  // ============================================================

  /**
   * 添加清理任务
   */
  async addCleanupJob(data: CleanupJobData): Promise<string> {
    const job = await this.cleanupQueue.add('cleanup', data);

    this.logger.log(`Cleanup job created: ${job.id} type: ${data.type}`);
    return job.id as string;
  }

  /**
   * 添加定时清理任务（每天执行）
   */
  async addRecurringCleanupJob(hour: number = 2, minute: number = 0): Promise<void> {
    // 使用 Bull 的 repeat 选项创建定时任务
    const cronPattern = `${minute} ${hour} * * *`; // 每天指定时间
    await this.cleanupQueue.add('cleanup', { type: 'old_logs' }, {
      repeat: { cron: cronPattern },
    });

    this.logger.log(`Recurring cleanup job scheduled at ${hour}:${minute}`);
  }

  // ============================================================
  // 队列管理
  // ============================================================

  /**
   * 获取所有队列统计
   */
  async getAllQueueStats(): Promise<QueueStats[]> {
    const queues = [
      { name: QUEUE_NAMES.AI_ANALYSIS, queue: this.aiAnalysisQueue },
      { name: QUEUE_NAMES.EMAIL, queue: this.emailQueue },
      { name: QUEUE_NAMES.NOTIFICATION, queue: this.notificationQueue },
      { name: QUEUE_NAMES.SYNC, queue: this.syncQueue },
      { name: QUEUE_NAMES.WEBHOOK, queue: this.webhookQueue },
      { name: QUEUE_NAMES.CLEANUP, queue: this.cleanupQueue },
    ];

    const stats: QueueStats[] = [];

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

  /**
   * 清空指定队列
   */
  async clearQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    // Bull 3.x 使用 obliterate() 清空所有任务
    await queue.obliterate({ force: true });
    this.logger.log(`Queue ${queueName} cleared`);
  }

  /**
   * 暂停指定队列
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Queue ${queueName} paused`);
  }

  /**
   * 恢复指定队列
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Queue ${queueName} resumed`);
  }

  /**
   * 重试失败的任务
   */
  async retryFailedJobs(queueName: QueueName, limit: number = 100): Promise<number> {
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

  // ============================================================
  // 私有方法
  // ============================================================

  private getQueue(queueName: QueueName): Queue {
    switch (queueName) {
      case QUEUE_NAMES.AI_ANALYSIS:
        return this.aiAnalysisQueue;
      case QUEUE_NAMES.EMAIL:
        return this.emailQueue;
      case QUEUE_NAMES.NOTIFICATION:
        return this.notificationQueue;
      case QUEUE_NAMES.SYNC:
        return this.syncQueue;
      case QUEUE_NAMES.WEBHOOK:
        return this.webhookQueue;
      case QUEUE_NAMES.CLEANUP:
        return this.cleanupQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }

  /**
   * 根据用户订阅等级获取任务优先级
   * 数字越小优先级越高
   */
  private async getUserPriority(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });

    switch (user?.subscriptionTier) {
      case SubscriptionTier.PRO:
        return 1; // 最高优先级
      case SubscriptionTier.PREMIUM:
        return 5;
      case SubscriptionTier.FREE:
      default:
        return 10; // 默认优先级
    }
  }
}
