/**
 * [BULL QUEUE PROCESSOR - ENHANCED]
 * 任务处理器 - 处理所有队列中的任务
 *
 * 优化：
 * - AI 队列优先级处理（PRO 用户优先）
 * - 进度跟踪（长任务状态更新）
 * - 错误分类（可重试 vs 不可重试）
 * - 批量处理支持
 */
import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed, OnQueueProgress, OnQueueStalled } from '@nestjs/bull';
import { Logger, Injectable } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { FoodAnalysisResult } from '../ai/ai-types';
import { QUEUE_NAMES } from './queue.constants';
import { SubscriptionTier } from '@prisma/client';
import {
  AiAnalysisJobData,
  EmailJobData,
  NotificationJobData,
  SyncJobData,
  WebhookJobData,
  CleanupJobData,
} from './bull-queue.service';

/**
 * AI 分析错误类型
 */
enum AiErrorType {
  NETWORK = 'network',           // 网络错误 - 可重试
  RATE_LIMIT = 'rate_limit',     // API 限流 - 延迟重试
  INVALID_IMAGE = 'invalid_image', // 无效图片 - 不可重试
  PARSING = 'parsing',           // 解析错误 - 可重试
  UNKNOWN = 'unknown',           // 未知错误 - 可重试
}

/**
 * AI 分析错误（带错误类型）
 */
class AiAnalysisError extends Error {
  constructor(
    message: string,
    public readonly type: AiErrorType,
    public readonly retryable: boolean = true,
  ) {
    super(message);
    this.name = 'AiAnalysisError';
  }
}

/**
 * 批量 AI 分析任务数据
 */
interface BatchAiAnalysisJobData {
  userId: string;
  items: Array<{
    imageUrl: string;
    thumbnailUrl: string;
    imageBase64: string;
    mealType?: string;
  }>;
}

/**
 * AI 分析处理器（优化版）
 */
@Injectable()
@Processor(QUEUE_NAMES.AI_ANALYSIS)
export class AiAnalysisProcessor {
  private readonly logger = new Logger(AiAnalysisProcessor.name);

  // 进度更新间隔（毫秒）
  private readonly PROGRESS_UPDATE_INTERVAL = 5000;

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private mealsService: MealsService,
  ) {}

  @Process('analyze')
  async handleAiAnalysis(job: Job<AiAnalysisJobData>): Promise<{ mealId: string; analysis: any }> {
    const { userId, imageUrl, thumbnailUrl, imageBase64, mealType } = job.data;

    // 获取用户信息用于日志记录
    const user = await this.getUserTier(userId);

    this.logger.log(`Processing AI analysis job: ${job.id} for user: ${userId} (${user?.subscriptionTier || 'FREE'})`);

    try {
      // 执行 AI 分析（带进度跟踪）
      const analysis: FoodAnalysisResult = await this.analyzeWithProgress(job, imageBase64);

      // 创建餐食记录
      const meal = await this.mealsService.create(userId, {
        imageUrl,
        thumbnailUrl,
        analysis,
        mealType: mealType as any,
      });

      this.logger.log(`AI analysis job ${job.id} completed, meal created: ${meal.id}`);

      return {
        mealId: meal.id,
        analysis,
      };
    } catch (error) {
      // 分类错误并决定是否重试
      const aiError = this.classifyError(error);

      // 如果是不可重试的错误，直接抛出（不重试）
      if (!aiError.retryable) {
        this.logger.error(`AI analysis job ${job.id} failed with non-retryable error: ${aiError.message}`);
        throw new AiAnalysisError(aiError.message, aiError.type, false);
      }

      this.logger.error(`AI analysis job ${job.id} failed (retryable): ${aiError.message}`);
      throw error;
    }
  }

  /**
   * 批量 AI 分析（优化处理多张图片）
   */
  @Process('analyze-batch')
  async handleBatchAiAnalysis(job: Job<BatchAiAnalysisJobData>): Promise<{ results: Array<{ mealId: string; analysis: any }>; success: number; failed: number }> {
    const { userId, items } = job.data;
    const results: Array<{ mealId: string; analysis: any }> = [];
    let success = 0;
    let failed = 0;

    this.logger.log(`Processing batch AI analysis: ${items.length} images for user: ${userId}`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // 更新批量任务进度
        await job.progress((i / items.length) * 100);

        const analysis: FoodAnalysisResult = await this.aiService.analyzeFoodImage(item.imageBase64);

        const meal = await this.mealsService.create(userId, {
          imageUrl: item.imageUrl,
          thumbnailUrl: item.thumbnailUrl,
          analysis,
          mealType: item.mealType as any,
        });

        results.push({ mealId: meal.id, analysis });
        success++;
      } catch (error) {
        this.logger.error(`Failed to analyze image ${i + 1}/${items.length}:`, error);
        failed++;
      }
    }

    await job.progress(100);

    this.logger.log(`Batch AI analysis completed: ${success} success, ${failed} failed`);

    return { results, success, failed };
  }

  /**
   * 带进度跟踪的 AI 分析
   */
  private async analyzeWithProgress(job: Job, imageBase64: string): Promise<FoodAnalysisResult> {
    // 对于可能较长的任务，定期更新进度
    const progressInterval = setInterval(() => {
      job.progress(50); // 分析中...
    }, this.PROGRESS_UPDATE_INTERVAL);

    try {
      const result = await this.aiService.analyzeFoodImage(imageBase64);
      clearInterval(progressInterval);
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  /**
   * 获取用户等级
   */
  private async getUserTier(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    return user;
  }

  /**
   * 根据用户等级返回任务优先级
   * 数字越小优先级越高
   */
  private getJobPriority(tier?: SubscriptionTier): number {
    switch (tier) {
      case SubscriptionTier.PRO:
        return 1; // 最高优先级
      case SubscriptionTier.PREMIUM:
        return 5;
      case SubscriptionTier.FREE:
      default:
        return 10; // 默认优先级
    }
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: any): AiAnalysisError {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // 网络错误
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return new AiAnalysisError(errorMessage, AiErrorType.NETWORK, true);
    }

    // API 限流
    if (message.includes('rate limit') || message.includes('quota') || message.includes('429')) {
      return new AiAnalysisError(errorMessage, AiErrorType.RATE_LIMIT, true);
    }

    // 无效图片
    if (message.includes('invalid image') || message.includes('not an image') || message.includes('unsupported format')) {
      return new AiAnalysisError(errorMessage, AiErrorType.INVALID_IMAGE, false);
    }

    // 解析错误
    if (message.includes('parse') || message.includes('json')) {
      return new AiAnalysisError(errorMessage, AiErrorType.PARSING, true);
    }

    // 默认为可重试的未知错误
    return new AiAnalysisError(errorMessage, AiErrorType.UNKNOWN, true);
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`AI job ${job.id} started processing`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    const duration = Date.now() - job.timestamp;
    this.logger.log(`AI job ${job.id} completed in ${duration}ms`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    const duration = Date.now() - job.timestamp;
    const attemptsMade = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 3;

    this.logger.error(
      `AI job ${job.id} failed after ${duration}ms (attempt ${attemptsMade}/${maxAttempts}): ${error.message}`,
    );
  }

  @OnQueueStalled()
  onStalled(job: Job) {
    this.logger.warn(`AI job ${job.id} stalled - might need investigation`);
  }

  @OnQueueProgress()
  onProgress(job: Job, progress: number) {
    this.logger.debug(`AI job ${job.id} progress: ${progress}%`);
  }
}

@Injectable()
@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  @Process('send')
  async handleSendEmail(job: Job<EmailJobData>): Promise<{ sent: boolean; messageId?: string }> {
    const { to, subject, template, context, html, text } = job.data;

    this.logger.log(`Sending email to: ${Array.isArray(to) ? to.join(', ') : to}`);

    try {
      // TODO: 实现邮件发送逻辑
      // 这里可以集成 SendGrid, AWS SES, 或其他邮件服务
      // 示例：使用 Nodemailer 发送邮件

      // const transporter = createTransporter();
      // const info = await transporter.sendMail({
      //   to,
      //   subject,
      //   html: html || this.renderTemplate(template, context),
      //   text,
      // });

      this.logger.log(`Email sent successfully: ${job.id}`);

      // 模拟发送成功
      return {
        sent: true,
        messageId: `msg-${job.id}`,
      };
    } catch (error) {
      this.logger.error(`Failed to send email ${job.id}:`, error);
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Email job ${job.id} completed`);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Email job ${job.id} failed: ${error.message}`);
  }
}

@Injectable()
@Processor(QUEUE_NAMES.NOTIFICATION)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  @Process('send')
  async handleSendNotification(job: Job<NotificationJobData>): Promise<{ sent: boolean }> {
    const { userId, type, title, body, data } = job.data;

    this.logger.log(`Sending ${type} notification to user: ${userId}`);

    try {
      // TODO: 实现通知发送逻辑
      // 这里可以集成 Firebase Cloud Messaging, OneSignal, 或其他推送服务
      // 也可以存储到数据库，让客户端通过轮询或 WebSocket 获取

      // 示例：存储到数据库
      // await this.prisma.notification.create({
      //   data: { userId, type, title, body, data },
      // });

      this.logger.log(`Notification sent to user ${userId}: ${title}`);

      return { sent: true };
    } catch (error) {
      this.logger.error(`Failed to send notification ${job.id}:`, error);
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.debug(`Notification job ${job.id} completed`);
  }
}

@Injectable()
@Processor(QUEUE_NAMES.SYNC)
export class SyncProcessor {
  private readonly logger = new Logger(SyncProcessor.name);
  constructor(private prisma: PrismaService) {}

  @Process('sync')
  async handleSync(job: Job<SyncJobData>): Promise<{ synced: number }> {
    const { userId, operation, lastSyncAt } = job.data;

    this.logger.log(`Processing ${operation} sync for user: ${userId}`);

    try {
      // TODO: 实现同步逻辑
      // 这里可以处理与外部服务的同步
      // 示例：与移动客户端同步数据

      let syncedCount = 0;

      switch (operation) {
        case 'full_sync':
          // 执行完全同步
          syncedCount = await this.performFullSync(userId);
          break;
        case 'incremental_sync':
          // 执行增量同步
          syncedCount = await this.performIncrementalSync(userId, lastSyncAt);
          break;
        case 'cleanup':
          // 清理同步数据
          syncedCount = await this.performCleanup(userId);
          break;
      }

      this.logger.log(`Sync job ${job.id} completed, synced ${syncedCount} records`);

      return { synced: syncedCount };
    } catch (error) {
      this.logger.error(`Sync job ${job.id} failed:`, error);
      throw error;
    }
  }

  private async performFullSync(userId: string): Promise<number> {
    // 实现完全同步逻辑
    return 0;
  }

  private async performIncrementalSync(userId: string, lastSyncAt?: Date): Promise<number> {
    // 实现增量同步逻辑
    return 0;
  }

  private async performCleanup(userId: string): Promise<number> {
    // 清理旧的同步数据
    return 0;
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Sync job ${job.id} completed`);
  }
}

@Injectable()
@Processor(QUEUE_NAMES.WEBHOOK)
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  @Process('send')
  async handleSendWebhook(job: Job<WebhookJobData>): Promise<{ sent: boolean; statusCode?: number }> {
    const { url, method, payload, headers, signature } = job.data;

    this.logger.log(`Sending webhook to: ${url}`);

    try {
      // TODO: 实现 Webhook 发送逻辑
      // 示例：使用 fetch 或 axios 发送 HTTP 请求

      // const response = await fetch(url, {
      //   method,
      //   headers: {
      //     'Content-Type': 'application/json',
      //     ...(signature && { 'X-Signature': signature }),
      //     ...headers,
      //   },
      //   body: JSON.stringify(payload),
      // });

      this.logger.log(`Webhook sent to ${url}: ${job.id}`);

      // 模拟发送成功
      return {
        sent: true,
        statusCode: 200,
      };
    } catch (error) {
      this.logger.error(`Failed to send webhook ${job.id}:`, error);
      throw error;
    }
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Webhook job ${job.id} failed: ${error.message}`);
  }
}

@Injectable()
@Processor(QUEUE_NAMES.CLEANUP)
export class CleanupProcessor {
  private readonly logger = new Logger(CleanupProcessor.name);
  constructor(private prisma: PrismaService) {}

  @Process('cleanup')
  async handleCleanup(job: Job<CleanupJobData>): Promise<{ deleted: number }> {
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
          // 清理缓存通过 CacheService 处理
          deletedCount = await this.cleanupCache(beforeDate);
          break;
      }

      this.logger.log(`Cleanup job ${job.id} completed, deleted ${deletedCount} records`);

      return { deleted: deletedCount };
    } catch (error) {
      this.logger.error(`Cleanup job ${job.id} failed:`, error);
      throw error;
    }
  }

  private async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refresh_tokens.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }

  private async cleanupOldLogs(beforeDate?: Date): Promise<number> {
    const date = beforeDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 默认删除 90 天前的日志

    // TODO: 如果有日志表，在这里清理
    return 0;
  }

  private async cleanupFailedJobs(beforeDate?: Date): Promise<number> {
    const date = beforeDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 默认删除 7 天前的失败任务

    const result = await this.prisma.ai_analysis_jobs.deleteMany({
      where: {
        status: 'FAILED',
        completedAt: { lt: date },
      },
    });
    return result.count;
  }

  private async cleanupCache(beforeDate?: Date): Promise<number> {
    // TODO: 清理 Redis 缓存
    return 0;
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`Cleanup job ${job.id} completed`);
  }
}

// 导出所有处理器
export const QueueProcessor = [
  AiAnalysisProcessor,
  EmailProcessor,
  NotificationProcessor,
  SyncProcessor,
  WebhookProcessor,
  CleanupProcessor,
];
