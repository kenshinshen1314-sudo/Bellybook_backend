// 导出原有的数据库队列（保持向后兼容）
export { QueueModule } from './queue.module';
export type { CreateAiJobInput, AiJobResponse, AiJobDetailResponse, JobStatus } from './queue.types';

// 导出新的 Bull 队列
export { BullQueueModule } from './bull-queue.module';
export { QueueService } from './bull-queue.service';
export { QUEUE_NAMES, QUEUE_CONFIGS } from './queue.constants';

// 导出类型
export type {
  AiAnalysisJobData,
  EmailJobData,
  NotificationJobData,
  SyncJobData,
  WebhookJobData,
  CleanupJobData,
  JobResponse,
  QueueStats,
} from './bull-queue.service';

export type { QueueName } from './queue.constants';
