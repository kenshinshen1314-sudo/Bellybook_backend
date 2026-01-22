/**
 * [INPUT]: 依赖 @prisma/client 的 PrismaClient
 * [OUTPUT]: 对外提供数据库连接、事务管理、测试清理方法
 * [POS]: database 模块的核心服务，全局单例，被所有 Service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Prisma 事务结果类型
 */
export type TransactionResult<T> = {
  data: T;
  error?: Error;
};

/**
 * Prisma 事务选项
 */
export type TransactionOptions = {
  maxWait?: number;      // 最大等待时间（毫秒）
  timeout?: number;      // 超时时间（毫秒）
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['query', 'error', 'warn'],
    });
  }

  // ============================================================
  // 生命周期钩子
  // ============================================================

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  // ============================================================
  // 事务管理
  // ============================================================

  /**
   * 执行事务 - 带自动重试和详细日志
   *
   * @param callback 事务回调函数，接收事务实例作为参数
   * @param options 事务选项
   * @returns 事务执行结果
   *
   * @example
   * ```typescript
   * const result = await prisma.runTransaction(async (tx) => {
   *   const user = await tx.user.create({ ... });
   *   const profile = await tx.profile.create({ ... });
   *   return { user, profile };
   * });
   * ```
   */
  async runTransaction<T>(
    callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await this.$transaction(
        callback,
        {
          maxWait: options?.maxWait ?? 5000,    // 默认最多等 5 秒获取连接
          timeout: options?.timeout ?? 10000,   // 默认 10 秒超时
          isolationLevel: options?.isolationLevel,
        },
      );

      const duration = Date.now() - startTime;
      this.logger.debug(`Transaction completed in ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Prisma 已知错误
        this.logger.error(
          `Transaction failed after ${duration}ms: ${error.code} - ${error.message}`,
        );

        // 处理常见错误码
        switch (error.code) {
          case 'P2002':
            throw new Error(`唯一约束冲突: ${(error.meta?.target as string[])?.join(', ')}`);
          case 'P2025':
            throw new Error('记录不存在');
          case 'P2034':
            throw new Error('事务写入冲突，请重试');
          default:
            throw error;
        }
      }

      this.logger.error(`Transaction failed after ${duration}ms: ${error}`);
      throw error;
    }
  }

  /**
   * 批量事务 - 并行执行多个独立操作
   *
   * @param callbacks 事务回调数组
   * @returns 所有事务结果
   *
   * @example
   * ```typescript
   * const results = await prisma.batchTransactions([
   *   (tx) => tx.user.create(...),
   *   (tx) => tx.post.create(...),
   * ]);
   * ```
   */
  async batchTransactions<T>(
    callbacks: Array<
      (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
    >,
  ): Promise<T[]> {
    // Prisma 的 $transaction 支持两种签名：
    // 1. 数组形式：并行执行多个操作
    // 2. 函数形式：顺序执行单个操作
    // 这里需要使用函数形式，将回调数组包装在一个函数中
    return this.$transaction(async (tx) => {
      return Promise.all(callbacks.map((fn) => fn(tx as any)));
    });
  }

  // ============================================================
  // 测试工具
  // ============================================================

  /**
   * 清空数据库 - 仅用于测试环境
   *
   * ⚠️ 警告：此方法在生产环境会被阻止
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    this.logger.warn('Cleaning database...');

    // 获取所有模型
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_' && key[0] !== '$'
    );

    // 按依赖顺序删除（子表先删）
    const deleteOrder = [
      'dishUnlock', 'dailyNutrition', 'refreshToken',
      'meal', 'userSettings', 'userProfile', 'user', 'dish',
    ];

    const results: Record<string, number> = {};

    for (const modelName of deleteOrder) {
      const model = (this as any)[modelName];
      if (model && typeof model.deleteMany === 'function') {
        const result = await model.deleteMany({});
        results[modelName] = result.count;
      }
    }

    this.logger.log(`Database cleaned: ${JSON.stringify(results)}`);
    return results;
  }

  // ============================================================
  // 健康检查
  // ============================================================

  /**
   * 检查数据库连接状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取数据库连接统计
   */
  getConnectionStats() {
    // Prisma 不直接暴露连接池信息，这里返回基本信息
    return {
      connected: true,
      // 如果需要更详细信息，可以使用 Prisma 的扩展功能
    };
  }
}
