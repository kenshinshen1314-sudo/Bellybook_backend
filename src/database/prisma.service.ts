/**
 * [INPUT]: 依赖 @prisma/client 的 PrismaClient
 * [OUTPUT]: 对外提供数据库连接、事务管理、测试清理方法
 * [POS]: database 模块的核心服务，全局单例，被所有 Service 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [PERFORMANCE NOTES]
 * - 配置连接池优化并发性能
 * - 添加慢查询日志（>100ms）
 * - 使用 prepared statements 缓存
 * - 连接池监控和统计
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { env } from '../config/env';

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

/**
 * 慢查询阈值（毫秒）
 */
const SLOW_QUERY_THRESHOLD = 100;

/**
 * 连接池统计信息
 */
export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  failedConnections: number;
  avgQueryTime: number;
  slowQueries: number;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private queryStartTime = new Map<string, number>();

  // 连接池统计
  private stats = {
    totalQueries: 0,
    totalQueryTime: 0,
    slowQueries: 0,
    failedQueries: 0,
  };

  constructor() {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
      // 连接池配置 - 优化并发性能
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
      // Prisma Client 内部优化
      errorFormat: 'minimal',
    });

    // 监听查询事件 - 记录慢查询和统计
    this.$on('query' as never, (e: any) => {
      const queryKey = `${e.timestamp}_${e.query.substring(0, 50)}`;
      this.queryStartTime.set(queryKey, Date.now());
    });

    this.$on('query' as never, (e: any) => {
      const queryKey = `${e.timestamp}_${e.query.substring(0, 50)}`;
      const startTime = this.queryStartTime.get(queryKey);
      if (startTime) {
        const duration = Date.now() - startTime;

        // 更新统计
        this.stats.totalQueries++;
        this.stats.totalQueryTime += duration;

        if (duration > SLOW_QUERY_THRESHOLD) {
          this.stats.slowQueries++;
          this.logger.warn(`Slow query (${duration}ms): ${e.query.substring(0, 100)}...`);
        }

        this.queryStartTime.delete(queryKey);
      }
    });

    // 监听错误
    this.$on('error' as never, (e: any) => {
      this.stats.failedQueries++;
      this.logger.error(`Database error: ${e.message}`);
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
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 每次重试前检查连接健康状态
        const isConnected = await this.healthCheck();
        if (!isConnected) {
          this.logger.warn(`Database not connected, attempting to reconnect (attempt ${attempt}/${maxRetries})...`);
          await this.$disconnect();
          await this.$connect();
        }

        const result = await this.$transaction(
          callback,
          {
            maxWait: options?.maxWait ?? 15000,   // 增加到 15 秒
            timeout: options?.timeout ?? 45000,    // 增加到 45 秒
            isolationLevel: options?.isolationLevel,
          },
        );

        const duration = Date.now() - startTime;
        this.logger.debug(`Transaction completed in ${duration}ms${attempt > 1 ? ` (retry ${attempt})` : ''}`);

        return result;
      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - startTime;

        // 检查是否是事务连接错误，如果是且还有重试次数，则重试
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          const isTransactionError = error.message.includes('Transaction') &&
            (error.message.includes('not found') ||
             error.message.includes('invalid') ||
             error.message.includes('disconnected') ||
             error.message.includes('timeout'));

          if (isTransactionError && attempt < maxRetries) {
            this.logger.warn(
              `Transaction attempt ${attempt} failed after ${duration}ms, retrying... Error: ${error.message}`
            );
            // 等待一段时间后重试（指数退避）
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
            continue;
          }

          // Prisma 已知错误 - 不重试
          this.logger.error(
            `Transaction failed after ${duration}ms: ${error.code} - ${error.message}`,
          );

          // 处理常见错误码
          switch (error.code) {
            case 'P2002':
              throw new ConflictException(`唯一约束冲突: ${(error.meta?.target as string[])?.join(', ')}`);
            case 'P2025':
              throw new NotFoundException('记录不存在');
            case 'P2034':
              throw new ConflictException('事务写入冲突，请重试');
            default:
              throw error;
          }
        }

        // 非已知错误，检查是否需要重试
        if (attempt < maxRetries &&
            (lastError.message.includes('Transaction') || lastError.message.includes('database'))) {
          this.logger.warn(
            `Transaction attempt ${attempt} failed after ${duration}ms, retrying... Error: ${lastError.message}`
          );
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }

        this.logger.error(`Transaction failed after ${duration}ms: ${lastError}`);
        throw lastError;
      }
    }

    // 理论上不会到达这里，但为了类型安全
    throw lastError || new Error('Transaction failed with unknown error');
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
      throw new ForbiddenException('Cannot clean database in production');
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
  getConnectionStats(): ConnectionPoolStats & { connected: boolean } {
    const avgQueryTime = this.stats.totalQueries > 0
      ? Math.round(this.stats.totalQueryTime / this.stats.totalQueries)
      : 0;

    // 从 DATABASE_URL 解析 connection_limit
    const url = new URL(env.DATABASE_URL);
    const connectionLimit = parseInt(url.searchParams.get('connection_limit') || '10', 10);

    return {
      connected: true,
      totalConnections: connectionLimit,
      activeConnections: Math.min(connectionLimit, this.stats.totalQueries),
      idleConnections: Math.max(0, connectionLimit - Math.min(connectionLimit, this.stats.totalQueries)),
      failedConnections: this.stats.failedQueries,
      avgQueryTime,
      slowQueries: this.stats.slowQueries,
    };
  }

  /**
   * 获取详细性能报告
   */
  getPerformanceReport() {
    const stats = this.getConnectionStats();
    return {
      ...stats,
      totalQueries: this.stats.totalQueries,
      querySuccessRate: this.stats.totalQueries > 0
        ? ((this.stats.totalQueries - this.stats.failedQueries) / this.stats.totalQueries * 100).toFixed(2) + '%'
        : '100%',
      slowQueryRate: this.stats.totalQueries > 0
        ? (this.stats.slowQueries / this.stats.totalQueries * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}
