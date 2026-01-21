/**
 * [INPUT]: 接收缓存类型、时间段、后缀参数
 * [OUTPUT]: 生成唯一的缓存键
 * [POS]: ranking 模块的缓存键工具类
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { RankingPeriod } from '@prisma/client';

/**
 * 缓存键类型
 */
export enum CacheKeyType {
  CUISINE_MASTERS = 'cuisine_masters',
  LEADERBOARD = 'leaderboard',
  STATS = 'stats',
  GOURMETS = 'gourmets',
  DISH_EXPERTS = 'dish_experts',
}

/**
 * 缓存键工具类
 */
export class CacheKeyUtil {
  /**
   * 构建缓存键
   * @param type 缓存类型
   * @param period 时间段
   * @param suffix 可选后缀（如菜系名称、订阅等级）
   * @returns 格式化的缓存键
   */
  static build(
    type: CacheKeyType,
    period: RankingPeriod,
    suffix?: string | undefined,
  ): string {
    const parts: string[] = [type, period];
    if (suffix) parts.push(suffix);
    return parts.join(':');
  }

  /**
   * 构建菜系专家榜缓存键
   */
  static cuisineMasters(period: RankingPeriod, cuisineName?: string): string {
    return this.build(CacheKeyType.CUISINE_MASTERS, period, cuisineName);
  }

  /**
   * 构建综合排行榜缓存键
   */
  static leaderboard(period: RankingPeriod, tier?: string): string {
    return this.build(CacheKeyType.LEADERBOARD, period, tier);
  }

  /**
   * 构建统计数据缓存键
   */
  static stats(period: RankingPeriod): string {
    return this.build(CacheKeyType.STATS, period);
  }

  /**
   * 构建美食家榜缓存键
   */
  static gourmets(period: RankingPeriod): string {
    return this.build(CacheKeyType.GOURMETS, period);
  }

  /**
   * 构建菜品专家榜缓存键
   */
  static dishExperts(period: RankingPeriod): string {
    return this.build(CacheKeyType.DISH_EXPERTS, period);
  }
}
