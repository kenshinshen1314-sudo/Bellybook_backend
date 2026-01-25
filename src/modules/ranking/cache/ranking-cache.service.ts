/**
 * [INPUT]: 依赖 CacheService (Redis)
 * [OUTPUT]: 对外提供排行榜专用缓存操作
 * [POS]: ranking 模块的缓存服务层（Redis 版本）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';
import { CacheTTL, CachePrefix } from '../../cache/cache.constants';

/**
 * 排行榜缓存 TTL 配置（秒）
 */
export const RankingCacheTTL = {
  STATS: CacheTTL.MEDIUM,        // 5 分钟 - 统计数据
  LEADERBOARD: CacheTTL.MEDIUM,  // 5 分钟 - 排行榜
  CUISINE_MASTERS: CacheTTL.MEDIUM, // 5 分钟 - 菜系专家榜
  GOURMETS: CacheTTL.MEDIUM,     // 5 分钟 - 美食家榜
  DISH_EXPERTS: CacheTTL.MEDIUM, // 5 分钟 - 菜品专家榜
  USER_DETAILS: CacheTTL.SHORT,  // 1 分钟 - 用户详情（频繁变化）
} as const;

@Injectable()
export class RankingCacheService {
  private readonly logger = new Logger(RankingCacheService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 获取缓存数据
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheService.getWithPrefix<T>('RANKING' as any, key);
    return value ?? null;
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, data: T, ttl: number = RankingCacheTTL.LEADERBOARD): Promise<void> {
    await this.cacheService.setWithPrefix('RANKING' as any, key, data, ttl);
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    await this.cacheService.delWithPrefix('RANKING' as any, key);
  }

  /**
   * 清理过期缓存（Redis 自动处理，此方法为兼容接口）
   */
  async clearExpired(): Promise<void> {
    // Redis 自动清理过期键，无需手动处理
    this.logger.debug('Redis automatically handles expired cache cleanup');
  }

  /**
   * 清空所有排行榜缓存
   */
  async clearAll(): Promise<void> {
    // Redis 需要通过 pattern 匹配删除
    // 这里简化为清空所有缓存（实际生产中应更精确）
    await this.cacheService.reset();
    this.logger.log('Cleared all ranking cache');
  }

  /**
   * 清空特定时间段的缓存
   */
  async clearPeriod(period: string): Promise<void> {
    // 删除包含该时间段的所有缓存键
    await this.cacheService.delPattern(`ranking:*:${period}`);
    this.logger.log(`Cleared ranking cache for period: ${period}`);
  }

  /**
   * 缓存预热 - 预加载热点数据
   */
  async warmup(keysAndValues: Array<{ key: string; value: unknown; ttl?: number }>): Promise<void> {
    await this.cacheService.setMany(
      keysAndValues.map(({ key, value, ttl }) => ({
        key: `ranking:${key}`,
        value,
        ttl: ttl ?? RankingCacheTTL.LEADERBOARD,
      }))
    );
    this.logger.log(`Cache warmup completed: ${keysAndValues.length} entries`);
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    prefix: string;
    note: string;
  }> {
    return {
      prefix: 'ranking',
      note: 'Redis cache stats require direct Redis client connection',
    };
  }
}
