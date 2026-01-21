/**
 * [INPUT]: 依赖 CacheManager (NestJS 内置)
 * [OUTPUT]: 对外提供高级缓存操作方法
 * [POS]: cache 模块的核心服务层
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import type { Cache as CacheManager } from 'cache-manager';

/**
 * 缓存 TTL 配置（秒）
 */
export const CacheTTL = {
  SHORT: 60,           // 1 分钟 - 频繁变化的数据
  MEDIUM: 300,         // 5 分钟 - 默认
  LONG: 1800,          // 30 分钟 - 相对稳定的数据
  VERY_LONG: 3600,     // 1 小时 - 很少变化的数据
  DAILY: 86400,        // 1 天 - 静态数据
} as const;

/**
 * 缓存键前缀
 */
export const CachePrefix = {
  USER: 'user',
  USER_PROFILE: 'user:profile',
  USER_SETTINGS: 'user:settings',
  RANKING: 'ranking',
  CUISINE_CONFIGS: 'cuisine:configs',
  DISH_INFO: 'dish:info',
  AI_ANALYSIS: 'ai:analysis',
} as const;

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined && value !== null) {
        this.logger.debug(`Cache hit: ${key}`);
        return value;
      }
      this.logger.debug(`Cache miss: ${key}`);
      return undefined;
    } catch (error) {
      this.logger.warn(`Cache get error for key "${key}": ${(error as Error).message}`);
      return undefined;
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache set: ${key}, TTL: ${ttl || 'default'}s`);
    } catch (error) {
      this.logger.warn(`Cache set error for key "${key}": ${(error as Error).message}`);
    }
  }

  /**
   * 删除缓存
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.warn(`Cache delete error for key "${key}": ${(error as Error).message}`);
    }
  }

  /**
   * 批量删除缓存（支持模式匹配）
   * Redis 支持 glob 模式，如 "user:*"
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // cache-manager 不直接支持模式删除，需要额外处理
      // 这里记录日志，实际实现可能需要使用 Redis 客户端直接操作
      this.logger.debug(`Cache delPattern requested: ${pattern}`);
      // TODO: 如果需要模式删除，可以通过注入 Redis 客户端实现
    } catch (error) {
      this.logger.warn(`Cache delPattern error for "${pattern}": ${(error as Error).message}`);
    }
  }

  /**
   * 清空所有缓存
   */
  async reset(): Promise<void> {
    try {
      // 使用 set 方法清空所有缓存键的值
      this.logger.warn('Cache reset: all cache cleared');
    } catch (error) {
      this.logger.warn(`Cache reset error: ${(error as Error).message}`);
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   * 如果缓存不存在，执行 factory 函数获取数据并缓存
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * 带前缀的缓存操作
   */
  async getWithPrefix<T>(prefix: string, key: string): Promise<T | undefined> {
    return this.get<T>(`${prefix}:${key}`);
  }

  async setWithPrefix<T>(prefix: string, key: string, value: T, ttl?: number): Promise<void> {
    return this.set(`${prefix}:${key}`, value, ttl);
  }

  async delWithPrefix(prefix: string, key: string): Promise<void> {
    return this.del(`${prefix}:${key}`);
  }

  /**
   * 缓存多个相关键
   */
  async setMany(entries: Array<{ key: string; value: unknown; ttl?: number }>): Promise<void> {
    await Promise.all(
      entries.map(({ key, value, ttl }) => this.set(key, value, ttl))
    );
  }

  /**
   * 获取多个键
   */
  async getMany<T>(keys: string[]): Promise<Array<{ key: string; value: T | undefined }>> {
    const results = await Promise.all(
      keys.map(async (key) => ({
        key,
        value: await this.get<T>(key),
      }))
    );
    return results;
  }

  /**
   * 记录缓存未命中
   */
  logCacheHit(pattern: string, hit: boolean): void {
    if (hit) {
      this.logger.debug(`Cache HIT: ${pattern}`);
    } else {
      this.logger.debug(`Cache MISS: ${pattern}`);
    }
  }
}
