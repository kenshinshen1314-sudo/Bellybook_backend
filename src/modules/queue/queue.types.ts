/**
 * [INPUT]: 无依赖，纯类型定义
 * [OUTPUT]: 对外提供队列相关的所有类型定义
 * [POS]: queue 模块的核心类型契约
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { MealType } from '@prisma/client';

/**
 * AI 分析任务状态
 */
export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * AI 分析任务创建输入
 */
export interface CreateAiJobInput {
  userId: string;
  imageUrl: string;
  thumbnailUrl: string;
  imageBase64: string;
  mealType?: MealType;
}

/**
 * AI 分析任务响应
 */
export interface AiJobResponse {
  jobId: string;
  status: JobStatus;
  message: string;
}

/**
 * AI 分析任务详情响应
 */
export interface AiJobDetailResponse {
  id: string;
  status: JobStatus;
  imageUrl: string;
  thumbnailUrl: string;
  analysisResult?: unknown;
  mealId?: string;
  error?: string;
  retryCount: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
