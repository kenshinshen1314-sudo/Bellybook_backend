/**
 * [QUEUE CONSTANTS]
 * 队列常量定义
 *
 * 移到单独文件避免循环依赖
 */

/**
 * 队列名称常量
 */
export const QUEUE_NAMES = {
  AI_ANALYSIS: 'ai-analysis',
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  SYNC: 'sync',
  WEBHOOK: 'webhook',
  CLEANUP: 'cleanup',
} as const;

/**
 * Queue name type
 */
export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

/**
 * Bull 队列配置
 */
export const QUEUE_CONFIGS = {
  [QUEUE_NAMES.AI_ANALYSIS]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100, age: 86400 },
      removeOnFail: { count: 500, age: 604800 },
      timeout: 60000,
    },
    limiter: {
      max: 5,        // 最多 5 个并发任务
      duration: 1000, // 每秒
    },
  },
  [QUEUE_NAMES.EMAIL]: {
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 200 },
      timeout: 30000,
    },
    limiter: {
      max: 10,
      duration: 60000, // 每分钟最多 10 封邮件
    },
  },
  [QUEUE_NAMES.NOTIFICATION]: {
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 1000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
      timeout: 10000,
    },
  },
  [QUEUE_NAMES.SYNC]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
      timeout: 120000,
    },
  },
  [QUEUE_NAMES.WEBHOOK]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 300 },
      timeout: 30000,
    },
  },
  [QUEUE_NAMES.CLEANUP]: {
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
      timeout: 300000, // 5 分钟
    },
  },
} as const;
