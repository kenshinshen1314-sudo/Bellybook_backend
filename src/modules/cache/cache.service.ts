/**
 * [INPUT]: 依赖 CacheManager (NestJS 内置)、CacheStatsService 的统计记录
 * [OUTPUT]: 对外提供高级缓存操作方法
 * [POS]: cache 模块的核心服务层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [OPTIMIZATION NOTES]
 * - 集成统计指标收集
 * - 实现 delPattern 通过 Redis 客户端
 * - 添加缓存穿透保护（空值缓存）
 * - 添加缓存击穿保护（单飞）
 * - 添加批量操作优化
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import type { Cache as CacheManager } from 'cache-manager';
import { createClient, RedisClientType } from 'redis';
import { env } from '../../config/env';
import { CacheStatsService } from './cache-stats.service';
import { CacheTTL, CachePrefix } from './cache.constants';

// 单飞 Map，防止缓存击穿
const singleFlightMap = new Map<string, Promise<unknown>>();

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: RedisClientType | null = null;
  private redisAvailable = false;
  private redisInitAttempted = false;

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly statsService: CacheStatsService,
  ) {
    // 延迟初始化，不阻塞启动
    setImmediate(() => {
      this.initRedisClient();
    });
  }

  /**
   * 初始化 Redis 客户端（用于模式删除等高级操作）
   * Redis 不可用时优雅降级，只记录一次警告
   */
  private async initRedisClient() {
    if (this.redisInitAttempted) {
      return; // 避免重复初始化
    }
    this.redisInitAttempted = true;

    try {
      this.redisClient = createClient({
        socket: {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          connectTimeout: 5000, // 5 秒连接超时
        },
        password: env.REDIS_PASSWORD || undefined,
        database: env.REDIS_DB,
      });

      // 只记录一次连接错误
      let errorLogged = false;
      this.redisClient.on('error', (err) => {
        if (!errorLogged) {
          this.logger.warn(`Redis client unavailable: ${err.message}. Advanced cache operations will be disabled.`);
          this.redisAvailable = false;
          errorLogged = true;
        }
      });

      this.redisClient.on('ready', () => {
        this.redisAvailable = true;
        this.logger.log('Redis client connected successfully');
      });

      await this.redisClient.connect().catch((err) => {
        if (!errorLogged) {
          this.logger.warn(`Redis connection failed: ${err.message}. Using fallback cache manager.`);
          errorLogged = true;
        }
        this.redisAvailable = false;
        this.redisClient = null;
      });
    } catch (error) {
      this.logger.warn(`Failed to initialize Redis client: ${(error as Error).message}. Using fallback cache manager.`);
      this.redisClient = null;
      this.redisAvailable = false;
    }
  }

  /**
   * 获取缓存（带统计）
   */
  async get<T>(key: string): Promise<T | undefined> {
    const startTime = Date.now();

    try {
      const value = await this.cacheManager.get<T>(key);

      if (value !== undefined && value !== null) {
        this.statsService.recordHit(key);
        const duration = (Date.now() - startTime) / 1000;
        this.statsService.recordGetDuration(key, duration);
        return value;
      }

      this.statsService.recordMiss(key);
      const duration = (Date.now() - startTime) / 1000;
      this.statsService.recordGetDuration(key, duration);
      return undefined;
    } catch (error) {
      this.statsService.recordError('get', key);
      this.logger.warn(`Cache get error for key "${key}": ${(error as Error).message}`);
      return undefined;
    }
  }

  /**
   * 设置缓存（带统计）
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();

    try {
      await this.cacheManager.set(key, value, ttl);
      this.statsService.recordSet(key);
      const duration = (Date.now() - startTime) / 1000;
      this.statsService.recordSetDuration(key, duration);
    } catch (error) {
      this.statsService.recordError('set', key);
      this.logger.warn(`Cache set error for key "${key}": ${(error as Error).message}`);
    }
  }

  /**
   * 删除缓存（带统计）
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.statsService.recordDelete(key);
    } catch (error) {
      this.statsService.recordError('del', key);
      this.logger.warn(`Cache delete error for key "${key}": ${(error as Error).message}`);
    }
  }

  /**
   * 批量删除缓存（支持模式匹配）
   * Redis 支持 glob 模式，如 "user:*"
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.redisClient || !this.redisAvailable) {
      // Redis 不可用时，优雅降级 - 不执行模式删除
      // 这是正常的，不应该记录警告
      return 0;
    }

    try {
      // 使用 SCAN 避免阻塞
      let cursor = 0;
      let deletedCount = 0;

      do {
        const result = await this.redisClient.scan(
          cursor,
          { MATCH: pattern, COUNT: 100 }
        );

        cursor = result.cursor;
        const keys = result.keys;

        if (keys.length > 0) {
          await this.redisClient.del(keys);
          deletedCount += keys.length;

          // 记录统计
          keys.forEach(key => this.statsService.recordDelete(key));
        }
      } while (cursor !== 0);

      this.logger.debug(`Deleted ${deletedCount} keys matching pattern: ${pattern}`);
      return deletedCount;
    } catch (error) {
      this.statsService.recordError('delPattern', pattern);
      this.logger.warn(`Cache delPattern error for "${pattern}": ${(error as Error).message}`);
      this.redisAvailable = false;
      return 0;
    }
  }

  /**
   * 清空所有缓存
   */
  async reset(): Promise<void> {
    try {
      if (this.redisClient && this.redisAvailable) {
        await this.redisClient.flushDb();
      }
      this.logger.warn('Cache reset: all cache cleared');
    } catch (error) {
      this.logger.warn(`Cache reset error: ${(error as Error).message}`);
      this.redisAvailable = false;
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护 + 单飞）
   * 如果缓存不存在，执行 factory 函数获取数据并缓存
   * 使用单飞防止缓存击穿：多个并发请求同一个 key 时，只执行一次 factory
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // 检查是否已有正在进行的请求
    const existingPromise = singleFlightMap.get(key);
    if (existingPromise) {
      this.logger.debug(`Single flight: waiting for existing request for key: ${key}`);
      return existingPromise as Promise<T>;
    }

    // 创建新的请求 promise
    const promise = (async () => {
      try {
        const value = await factory();

        // 缓存空值防止穿透（使用较短 TTL）
        if (value === null || value === undefined) {
          await this.set(key, { __NULL: true }, CacheTTL.SHORT);
        } else {
          await this.set(key, value, ttl);
        }

        return value;
      } finally {
        // 完成后移除单飞记录
        singleFlightMap.delete(key);
      }
    })();

    // 记录单飞
    singleFlightMap.set(key, promise);

    return promise;
  }

  /**
   * 带前缀的缓存操作
   */
  async getWithPrefix<T>(prefix: keyof typeof CachePrefix, key: string): Promise<T | undefined> {
    return this.get<T>(`${prefix}:${key}`);
  }

  async setWithPrefix<T>(prefix: keyof typeof CachePrefix, key: string, value: T, ttl?: number): Promise<void> {
    return this.set(`${prefix}:${key}`, value, ttl);
  }

  async delWithPrefix(prefix: keyof typeof CachePrefix, key: string): Promise<void> {
    return this.del(`${prefix}:${key}`);
  }

  /**
   * 缓存多个相关键（批量优化）
   */
  async setMany(entries: Array<{ key: string; value: unknown; ttl?: number }>): Promise<void> {
    if (this.redisClient && this.redisAvailable) {
      // 使用 Redis pipeline 批量设置
      try {
        const pipeline = this.redisClient.multi();

        for (const { key, value, ttl } of entries) {
          const serialized = JSON.stringify(value);
          if (ttl) {
            pipeline.setEx(key, ttl, serialized);
          } else {
            pipeline.set(key, serialized);
          }
        }

        await pipeline.exec();

        // 记录统计
        entries.forEach(({ key }) => this.statsService.recordSet(key));
        return;
      } catch (error) {
        this.logger.warn(`Redis pipeline failed, falling back to individual sets: ${(error as Error).message}`);
        this.redisAvailable = false;
      }
    }

    // Fallback to parallel set operations
    await Promise.all(
      entries.map(({ key, value, ttl }) => this.set(key, value, ttl))
    );
  }

  /**
   * 获取多个键（批量优化）
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    if (this.redisClient && this.redisAvailable && keys.length > 0) {
      try {
        // 使用 Redis mget 批量获取
        const values = await this.redisClient.mGet(keys);

        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = values[i];

          if (value !== null) {
            try {
              result.set(key, JSON.parse(value) as T);
              this.statsService.recordHit(key);
            } catch {
              // JSON 解析失败，记录未命中
              this.statsService.recordMiss(key);
            }
          } else {
            this.statsService.recordMiss(key);
          }
        }
        return result;
      } catch (error) {
        this.logger.warn(`Redis mget failed, falling back to individual gets: ${(error as Error).message}`);
        this.redisAvailable = false;
      }
    }

    // Fallback to individual gets
    const results = await Promise.all(
      keys.map(async (key) => ({
        key,
        value: await this.get<T>(key),
      }))
    );

    for (const { key, value } of results) {
      if (value !== undefined) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * 删除多个键（批量优化）
   */
  async delMany(keys: string[]): Promise<number> {
    if (this.redisClient && this.redisAvailable && keys.length > 0) {
      try {
        const deletedCount = await this.redisClient.del(keys);
        keys.forEach(key => this.statsService.recordDelete(key));
        return deletedCount;
      } catch (error) {
        this.logger.warn(`Redis del failed, falling back to individual deletes: ${(error as Error).message}`);
        this.redisAvailable = false;
      }
    }

    // Fallback to individual deletes
    await Promise.all(keys.map(key => this.del(key)));
    return keys.length;
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (this.redisClient && this.redisAvailable) {
      try {
        const result = await this.redisClient.exists(key);
        return result > 0;
      } catch (error) {
        this.logger.warn(`Redis exists failed, falling back to get: ${(error as Error).message}`);
        this.redisAvailable = false;
      }
    }

    // Fallback: try to get the key
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * 设置缓存（带 NX 参数：仅当 key 不存在时设置）
   * 用于分布式锁场景
   */
  async setNX(key: string, value: unknown, ttl: number): Promise<boolean> {
    if (this.redisClient && this.redisAvailable) {
      try {
        const result = await this.redisClient.set(key, JSON.stringify(value), {
          NX: true,
          EX: ttl,
        });
        return result === 'OK';
      } catch (error) {
        this.logger.warn(`Redis setNX failed, falling back to check-and-set: ${(error as Error).message}`);
        this.redisAvailable = false;
      }
    }

    // Fallback: check exists first, then set
    const exists = await this.exists(key);
    if (!exists) {
      await this.set(key, value, ttl);
      return true;
    }
    return false;
  }

  /**
   * 获取缓存统计摘要
   */
  async getStats() {
    return this.statsService.getSummary();
  }

  /**
   * 获取 Prometheus 指标
   */
  async getMetrics(): Promise<string> {
    return this.statsService.getMetrics();
  }

  /**
   * 记录缓存未命中（兼容旧代码）
   */
  logCacheHit(pattern: string, hit: boolean): void {
    if (hit) {
      this.logger.debug(`Cache HIT: ${pattern}`);
    } else {
      this.logger.debug(`Cache MISS: ${pattern}`);
    }
  }

  /**
   * Ping Redis（用于健康检查）
   */
  async ping(): Promise<boolean> {
    if (this.redisClient && this.redisAvailable) {
      try {
        const result = await this.redisClient.ping();
        return result === 'PONG';
      } catch (error) {
        this.logger.warn(`Redis ping failed: ${(error as Error).message}`);
        this.redisAvailable = false;
        return false;
      }
    }
    return false;
  }

  /**
   * 获取 Redis 连接状态
   */
  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }
}
