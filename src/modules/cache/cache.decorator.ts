/**
 * [INPUT]: 依赖 CacheService 的缓存操作、CacheStatsService 的统计记录
 * [OUTPUT]: 对外提供方法级别的缓存装饰器
 * [POS]: cache 模块的装饰器层，提供声明式缓存
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [USAGE]
 * @Cacheable('user', ['userId'], CacheTTL.MEDIUM)
 * async getUser(userId: string) { ... }
 *
 * @CacheInvalidate('user', ['userId'])
 * async updateUser(userId: string, data: UpdateUserDto) { ... }
 */
import { SetMetadata, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CacheService } from './cache.service';
import { CacheStatsService } from './cache-stats.service';
import { CacheTTL, CachePrefix } from './cache.constants';

/**
 * 缓存键元数据
 */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * 生成缓存键
 */
export function generateCacheKey(
  prefix: string,
  args: Record<string, unknown>,
): string {
  const sortedArgs = Object.keys(args)
    .sort()
    .map(key => `${key}=${JSON.stringify(args[key])}`)
    .join('&');

  return sortedArgs ? `${prefix}:${sortedArgs}` : prefix;
}

/**
 * 可缓存装饰器
 * 自动缓存方法返回值
 */
export function Cacheable(
  prefix: string | keyof typeof CachePrefix,
  paramNames: string[] = [],
  ttl: number = CacheTTL.MEDIUM,
) {
  return function <T extends { cacheService?: CacheService; cacheStatsService?: CacheStatsService }>(
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    // 保存元数据
    SetMetadata(CACHE_KEY_METADATA, { prefix, paramNames })(target, propertyKey, descriptor);

    descriptor.value = async function (this: T, ...args: unknown[]) {
      const cacheService = this.cacheService;
      const statsService = this.cacheStatsService;

      if (!cacheService) {
        return originalMethod.apply(this, args);
      }

      // 构建参数映射
      const params: Record<string, unknown> = {};
      paramNames.forEach((name, index) => {
        params[name] = args[index];
      });

      // 生成缓存键
      const cacheKey = generateCacheKey(prefix as string, params);

      // 尝试从缓存获取
      const startTime = Date.now();
      const cached = await cacheService.get(cacheKey);
      const duration = (Date.now() - startTime) / 1000;

      if (statsService) {
        statsService.recordGetDuration(cacheKey, duration);
      }

      if (cached !== undefined) {
        if (statsService) {
          statsService.recordHit(cacheKey);
        }
        return cached;
      }

      if (statsService) {
        statsService.recordMiss(cacheKey);
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 缓存结果
      await cacheService.set(cacheKey, result, ttl);

      if (statsService) {
        statsService.recordSet(cacheKey);
        const setDuration = (Date.now() - startTime) / 1000 - duration;
        statsService.recordSetDuration(cacheKey, setDuration);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存失效装饰器
 * 方法执行后使指定缓存失效
 */
export function CacheInvalidate(
  prefix: string | keyof typeof CachePrefix,
  paramNames: string[] = [],
  pattern: string | null = null,
) {
  return function <T extends { cacheService?: CacheService; cacheStatsService?: CacheStatsService }>(
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: T, ...args: unknown[]) {
      const cacheService = this.cacheService;
      const statsService = this.cacheStatsService;

      // 先执行原方法
      const result = await originalMethod.apply(this, args);

      if (!cacheService) {
        return result;
      }

      // 构建参数映射
      const params: Record<string, unknown> = {};
      paramNames.forEach((name, index) => {
        params[name] = args[index];
      });

      // 使缓存失效
      if (pattern) {
        await cacheService.delPattern(pattern);
      } else {
        const cacheKey = generateCacheKey(prefix as string, params);
        await cacheService.del(cacheKey);

        if (statsService) {
          statsService.recordDelete(cacheKey);
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存更新装饰器
 * 方法执行后更新缓存
 */
export function CachePut(
  prefix: string | keyof typeof CachePrefix,
  paramNames: string[] = [],
  ttl: number = CacheTTL.MEDIUM,
) {
  return function <T extends { cacheService?: CacheService; cacheStatsService?: CacheStatsService }>(
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: T, ...args: unknown[]) {
      const cacheService = this.cacheService;
      const statsService = this.cacheStatsService;

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      if (!cacheService) {
        return result;
      }

      // 构建参数映射
      const params: Record<string, unknown> = {};
      paramNames.forEach((name, index) => {
        params[name] = args[index];
      });

      // 更新缓存
      const cacheKey = generateCacheKey(prefix as string, params);
      await cacheService.set(cacheKey, result, ttl);

      if (statsService) {
        statsService.recordSet(cacheKey);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存预热装饰器
 * 服务启动时预热指定数据
 */
export function CacheWarmup(
  keys: Array<{ key: string; factory: string }>,
) {
  return function (target: new (...args: unknown[]) => object) {
    const originalOnModuleInit = target.prototype.onModuleInit;

    target.prototype.onModuleInit = async function (...args: unknown[]) {
      // 调用原始 onModuleInit
      if (originalOnModuleInit) {
        await originalOnModuleInit.apply(this, args);
      }

      const cacheService: CacheService = this.cacheService;
      const logger = new Logger(CacheWarmup.name);

      if (!cacheService) {
        return;
      }

      logger.log(`Starting cache warmup for ${keys.length} keys...`);

      for (const { key, factory } of keys) {
        try {
          // 调用指定方法获取数据
          const data = await this[factory].call(this);
          await cacheService.set(key, data);
          logger.debug(`Cache warmed: ${key}`);
        } catch (error) {
          logger.warn(`Failed to warm cache for ${key}: ${(error as Error).message}`);
        }
      }

      logger.log('Cache warmup completed');
    };
  };
}
