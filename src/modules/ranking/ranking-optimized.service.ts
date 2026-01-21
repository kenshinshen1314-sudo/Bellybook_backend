/**
 * [INPUT]: 依赖各查询服务和缓存服务
 * [OUTPUT]: 对外提供统一的排行榜 API，自动处理缓存
 * [POS]: ranking 模块的核心服务层（重构后）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [REFACTORING NOTES]
 * 原文件 840 行 → 拆分为多个职责单一的查询服务
 * - cuisine-masters.query.ts: 菜系专家榜
 * - leaderboard.query.ts: 综合排行榜
 * - gourmets.query.ts: 美食家榜
 * - dish-experts.query.ts: 菜品专家榜
 * - user-details.query.ts: 用户详情查询
 * - stats.query.ts: 统计数据
 * - ranking-cache.service.ts: 缓存服务
 * - cache-key.util.ts: 缓存键工具
 */
import { Injectable, Logger } from '@nestjs/common';
import { RankingPeriod } from '@prisma/client';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto, CuisineExpertDetailDto, AllUsersDishesDto, UserUnlockedDishesDto } from './dto/ranking-response.dto';

// Query Services
import { CuisineMastersQuery } from './queries/cuisine-masters.query';
import { LeaderboardQuery } from './queries/leaderboard.query';
import { GourmetsQuery } from './queries/gourmets.query';
import { DishExpertsQuery } from './queries/dish-experts.query';
import { UserDetailsQuery } from './queries/user-details.query';
import { StatsQuery } from './queries/stats.query';

// Cache Services
import { RankingCacheService } from './cache/ranking-cache.service';
import { CacheKeyUtil, CacheKeyType } from './cache/cache-key.util';

@Injectable()
export class RankingOptimizedService {
  private readonly logger = new Logger(RankingOptimizedService.name);

  constructor(
    // Query Services
    private readonly cuisineMastersQuery: CuisineMastersQuery,
    private readonly leaderboardQuery: LeaderboardQuery,
    private readonly gourmetsQuery: GourmetsQuery,
    private readonly dishExpertsQuery: DishExpertsQuery,
    private readonly userDetailsQuery: UserDetailsQuery,
    private readonly statsQuery: StatsQuery,
    // Cache Service
    private readonly cacheService: RankingCacheService,
  ) {}

  /**
   * 获取菜系专家榜（带缓存）
   */
  async getCuisineMasters(
    cuisineName?: string,
    period: RankingPeriod = RankingPeriod.ALL_TIME,
  ): Promise<CuisineMastersDto> {
    const cacheKey = CacheKeyUtil.cuisineMasters(period, cuisineName);

    // 尝试从缓存获取
    const cached = await this.cacheService.get<CuisineMastersDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // 执行查询
    const result = await this.cuisineMastersQuery.execute(cuisineName, period);

    // 写入缓存
    await this.cacheService.set(cacheKey, result);

    return result;
  }

  /**
   * 获取综合排行榜（带缓存）
   */
  async getLeaderboard(
    period: RankingPeriod = RankingPeriod.ALL_TIME,
    tier?: string,
  ): Promise<LeaderboardDto> {
    const cacheKey = CacheKeyUtil.leaderboard(period, tier);

    const cached = await this.cacheService.get<LeaderboardDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.leaderboardQuery.execute(period, tier);

    await this.cacheService.set(cacheKey, result);

    return result;
  }

  /**
   * 获取排行榜统计数据（带缓存）
   */
  async getRankingStats(period: RankingPeriod = RankingPeriod.ALL_TIME): Promise<RankingStatsDto> {
    const cacheKey = CacheKeyUtil.stats(period);

    const cached = await this.cacheService.get<RankingStatsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.statsQuery.execute(period);

    await this.cacheService.set(cacheKey, result);

    return result;
  }

  /**
   * 获取美食家榜（带缓存）
   */
  async getGourmets(period: RankingPeriod = RankingPeriod.ALL_TIME): Promise<GourmetsDto> {
    const cacheKey = CacheKeyUtil.gourmets(period);

    const cached = await this.cacheService.get<GourmetsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.gourmetsQuery.execute(period);

    await this.cacheService.set(cacheKey, result);

    return result;
  }

  /**
   * 获取菜品专家榜（带缓存）
   */
  async getDishExperts(period: RankingPeriod = RankingPeriod.ALL_TIME): Promise<DishExpertsDto> {
    const cacheKey = CacheKeyUtil.dishExperts(period);

    const cached = await this.cacheService.get<DishExpertsDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.dishExpertsQuery.execute(period);

    await this.cacheService.set(cacheKey, result);

    return result;
  }

  /**
   * 获取菜系专家详情（不含缓存，个性化数据）
   */
  async getCuisineExpertDetail(
    userId: string,
    cuisineName: string,
    period: RankingPeriod = RankingPeriod.ALL_TIME,
  ): Promise<CuisineExpertDetailDto> {
    return this.userDetailsQuery.getCuisineExpertDetail(userId, cuisineName, period);
  }

  /**
   * 获取所有用户的菜品清单（不含缓存，频繁变化）
   */
  async getAllUsersDishes(period: RankingPeriod = RankingPeriod.WEEKLY): Promise<AllUsersDishesDto> {
    return this.userDetailsQuery.getAllUsersDishes(period);
  }

  /**
   * 获取用户已解锁的菜肴（不含缓存，个性化数据）
   */
  async getUserUnlockedDishes(userId: string): Promise<UserUnlockedDishesDto> {
    return this.userDetailsQuery.getUserUnlockedDishes(userId);
  }

  /**
   * 清理过期缓存
   */
  async clearExpiredCache(): Promise<void> {
    await this.cacheService.clearExpired();
  }

  /**
   * 清空所有缓存
   */
  async clearAllCache(): Promise<void> {
    await this.cacheService.clearAll();
  }
}
