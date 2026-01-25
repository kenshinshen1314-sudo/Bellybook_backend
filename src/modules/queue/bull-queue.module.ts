/**
 * [BULL QUEUE MODULE]
 * 基于 Bull + Redis 的异步任务队列
 *
 * 功能：
 * - AI 图片分析
 * - 邮件发送
 * - 推送通知
 * - 数据同步
 * - Webhook 调用
 * - 定时任务
 *
 * 优势：
 * - Redis pub/sub，无需轮询
 * - 任务优先级
 * - 延迟任务
 * - 重试策略
 * - 并发控制
 * - 任务调度
 */
import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './bull-queue.service';
import {
  AiAnalysisProcessor,
  EmailProcessor,
  NotificationProcessor,
  SyncProcessor,
  WebhookProcessor,
  CleanupProcessor,
} from './bull-queue.processor';
import { QueueController } from './queue.controller';
import { CacheModuleClass } from '../cache/cache.module';
import { DatabaseModule } from '../../database/database.module';
import { AiModule } from '../ai/ai.module';
import { MealsModule } from '../meals/meals.module';
import { AuthModule } from '../auth/auth.module';
import { QUEUE_NAMES, QUEUE_CONFIGS } from './queue.constants';

@Global()
@Module({
  imports: [
    // 注册所有队列
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.AI_ANALYSIS,
        ...QUEUE_CONFIGS[QUEUE_NAMES.AI_ANALYSIS],
      },
      {
        name: QUEUE_NAMES.EMAIL,
        ...QUEUE_CONFIGS[QUEUE_NAMES.EMAIL],
      },
      {
        name: QUEUE_NAMES.NOTIFICATION,
        ...QUEUE_CONFIGS[QUEUE_NAMES.NOTIFICATION],
      },
      {
        name: QUEUE_NAMES.SYNC,
        ...QUEUE_CONFIGS[QUEUE_NAMES.SYNC],
      },
      {
        name: QUEUE_NAMES.WEBHOOK,
        ...QUEUE_CONFIGS[QUEUE_NAMES.WEBHOOK],
      },
      {
        name: QUEUE_NAMES.CLEANUP,
        ...QUEUE_CONFIGS[QUEUE_NAMES.CLEANUP],
      },
    ),
    DatabaseModule,
    CacheModuleClass,
    AuthModule, // Required for JwtAuthGuard in QueueController
    AiModule,
    MealsModule,
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    AiAnalysisProcessor,
    EmailProcessor,
    NotificationProcessor,
    SyncProcessor,
    WebhookProcessor,
    CleanupProcessor,
  ],
  exports: [QueueService],
})
export class BullQueueModule {}
