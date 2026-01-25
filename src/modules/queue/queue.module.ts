/**
 * [INPUT]: 依赖 AiModule、MealsModule、DatabaseModule
 * [OUTPUT]: 对外提供异步 AI 分析队列能力
 * [POS]: queue 模块的入口点，注册队列服务和相关依赖
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Module } from '@nestjs/common';
import { AiQueueService } from './ai-queue.service';
import { AiModule } from '../ai/ai.module';
import { MealsModule } from '../meals/meals.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [AiModule, MealsModule, DatabaseModule],
  providers: [AiQueueService],
  exports: [AiQueueService],
})
export class QueueModule {}
