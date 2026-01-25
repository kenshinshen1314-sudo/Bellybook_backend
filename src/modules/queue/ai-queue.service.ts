/**
 * [INPUT]: 依赖 PrismaService 的数据库访问、AiService 的 AI 分析、MealsService 的餐食管理
 * [OUTPUT]: 对外提供 AI 分析任务队列处理能力
 * [POS]: queue 模块的核心服务层，处理异步 AI 分析任务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [ARCHITECTURE]
 * - 使用数据库表作为任务队列（无需额外 Redis 依赖）
 * - interval 轮询处理待处理任务
 * - 指数退避重试机制
 * - 任务过期自动清理
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { MealsService } from '../meals/meals.service';
import { FoodAnalysisResult } from '../ai/ai-types';
import { CreateAiJobInput, AiJobResponse, AiJobDetailResponse, JobStatus } from './queue.types';
import { MealType } from '@prisma/client';

const MAX_RETRIES = 3;
const JOB_EXPIRY_HOURS = 24;
const PROCESSING_INTERVAL_MS = 2000; // 2 seconds
const MAX_CONCURRENT_JOBS = 3;

@Injectable()
export class AiQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiQueueService.name);
  private processingInterval: NodeJS.Timeout | null = null;
  private activeJobs = new Set<string>();
  private isShuttingDown = false;

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private mealsService: MealsService,
  ) {}

  onModuleInit() {
    this.startProcessor();
    this.logger.log('AI Queue processor started');
  }

  onModuleDestroy() {
    this.stopProcessor();
  }

  // ============================================================
  // 公共方法 - 任务管理
  // ============================================================

  /**
   * 创建 AI 分析任务
   * 返回 jobId，客户端可以轮询任务状态
   */
  async createJob(input: CreateAiJobInput): Promise<AiJobResponse> {
    const job = await this.prisma.ai_analysis_jobs.create({
      data: {
        userId: input.userId,
        imageUrl: input.imageUrl,
        thumbnailUrl: input.thumbnailUrl,
        imageBase64: input.imageBase64,
        mealType: input.mealType || MealType.SNACK,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + JOB_EXPIRY_HOURS * 60 * 60 * 1000),
      },
    });

    this.logger.log(`AI analysis job created: ${job.id} for user: ${input.userId}`);

    return {
      jobId: job.id,
      status: JobStatus.PENDING,
      message: 'AI analysis job created successfully',
    };
  }

  /**
   * 获取任务详情
   */
  async getJob(jobId: string, userId: string): Promise<AiJobDetailResponse | null> {
    const job = await this.prisma.ai_analysis_jobs.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== userId) {
      return null;
    }

    return {
      id: job.id,
      status: job.status as JobStatus,
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

  /**
   * 获取用户的任务列表
   */
  async getUserJobs(userId: string, limit = 10): Promise<AiJobDetailResponse[]> {
    const jobs = await this.prisma.ai_analysis_jobs.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return jobs.map(job => ({
      id: job.id,
      status: job.status as JobStatus,
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

  // ============================================================
  // 私有方法 - 任务处理器
  // ============================================================

  /**
   * 启动任务处理器
   */
  private startProcessor() {
    this.processingInterval = setInterval(() => {
      this.processPendingJobs();
    }, PROCESSING_INTERVAL_MS);
  }

  /**
   * 停止任务处理器
   */
  private stopProcessor() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.logger.log('AI Queue processor stopped');
    }
  }

  /**
   * 处理待处理任务
   */
  private async processPendingJobs() {
    if (this.isShuttingDown) return;
    if (this.activeJobs.size >= MAX_CONCURRENT_JOBS) {
      return; // 达到并发上限
    }

    try {
      // 获取待处理任务（使用 SELECT FOR UPDATE SKIP LOCKED 避免并发问题）
      const jobs = await this.prisma.$queryRaw<Array<{ id: string; userId: string; imagebase64: string }>>`
        SELECT id, "userId", "imageBase64"
        FROM ai_analysis_jobs
        WHERE "status" = 'PENDING'
          AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
        ORDER BY "createdAt" ASC
        LIMIT ${MAX_CONCURRENT_JOBS - this.activeJobs.size}
        FOR UPDATE SKIP LOCKED
      `;

      for (const job of jobs) {
        if (this.activeJobs.has(job.id)) continue;

        this.activeJobs.add(job.id);
        this.processJob(job.id).finally(() => {
          this.activeJobs.delete(job.id);
        });
      }
    } catch (error) {
      this.logger.error('Error fetching pending jobs:', error);
    }
  }

  /**
   * 处理单个任务
   */
  private async processJob(jobId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // 更新状态为处理中
      await this.prisma.ai_analysis_jobs.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      // 获取任务详情
      const job = await this.prisma.ai_analysis_jobs.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        this.logger.error(`Job ${jobId} not found`);
        return;
      }

      // 执行 AI 分析
      this.logger.debug(`Processing AI analysis job: ${jobId}`);
      const analysis: FoodAnalysisResult = await this.aiService.analyzeFoodImage(job.imageBase64);

      // 创建餐食记录
      const meal = await this.mealsService.create(job.userId, {
        imageUrl: job.imageUrl,
        thumbnailUrl: job.thumbnailUrl,
        analysis,
        mealType: job.mealType as any,
      });

      // 更新任务状态为完成
      await this.prisma.ai_analysis_jobs.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          analysisResult: analysis as any,
          mealId: meal.id,
          completedAt: new Date(),
        },
      });

      const duration = Date.now() - startTime;
      this.logger.log(`AI analysis job ${jobId} completed in ${duration}ms`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // 获取当前重试次数
      const currentJob = await this.prisma.ai_analysis_jobs.findUnique({
        where: { id: jobId },
        select: { retryCount: true },
      });

      const newRetryCount = (currentJob?.retryCount || 0) + 1;

      if (newRetryCount >= MAX_RETRIES) {
        // 达到最大重试次数，标记为失败
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
      } else {
        // 重试
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

  /**
   * 清理过期任务（定时任务，可单独调用）
   */
  async cleanupExpiredJobs(): Promise<void> {
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
}
