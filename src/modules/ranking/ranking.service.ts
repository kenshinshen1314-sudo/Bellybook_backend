/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供排行榜、菜系专家、美食家、菜品专家统计
 * [POS]: ranking 模块的核心服务层，被 ranking.controller 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 *
 * [PERFORMANCE NOTE]
 * 当前实现在内存中进行聚合计算，适合中小规模数据（<10000 meals）。
 * 如需优化，可考虑：
 * - 使用数据库视图预计算统计数据
 * - 添加 Redis 缓存层（TTL: 5分钟）
 * - 使用 Prisma 的 groupBy 或原始 SQL 聚合查询
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto, CuisineMasterEntry, LeaderboardEntry, GourmetEntry, DishExpertEntry, CuisineExpertDetailDto, CuisineExpertDishEntry, AllUsersDishesDto, UserUnlockedDishesDto, UnlockedDishEntry } from './dto/ranking-response.dto';
import { RankingPeriod } from './dto/ranking-query.dto';

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(private prisma: PrismaService) { }

  /**
   * 获取菜系专家榜
   * 过滤掉 hideRanking: true 的用户
   */
  async getCuisineMasters(
    cuisineName?: string,
    period: RankingPeriod = RankingPeriod.ALL_TIME,
  ): Promise<CuisineMastersDto> {
    const { startDate } = this.getDateRange(period);

    // 查询用户信息（包含 hideRanking 设置）- 需要关联 user_settings 表
    const usersWithSettings = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        user_settings: {
          hideRanking: false, // 关键：只显示愿意参与排行榜的用户
        },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userIds = usersWithSettings.map(u => u.id);
    const userMap = new Map(usersWithSettings.map(u => [u.id, u]));

    // 构建查询条件
    const where: Prisma.MealWhereInput = {
      userId: { in: userIds },
      deletedAt: null,
    };

    if (cuisineName) {
      where.cuisine = cuisineName;
    }

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    // 获取餐食记录
    const meals = await this.prisma.meal.findMany({
      where,
      select: {
        userId: true,
        cuisine: true,
        createdAt: true,
      },
    });

    // 按用户分组统计（统计每个用户的总菜品数量，不区分菜系）
    const userStats = new Map<string, { count: number; firstMealAt: Date; cuisines: Set<string> }>();

    for (const meal of meals) {
      const existing = userStats.get(meal.userId);

      if (!existing) {
        userStats.set(meal.userId, {
          count: 1,
          firstMealAt: new Date(meal.createdAt),
          cuisines: new Set([meal.cuisine]),
        });
      } else {
        existing.count++;
        existing.cuisines.add(meal.cuisine);
      }
    }

    // 构建排行榜数据
    const rankings: Array<{ userId: string; username: string; avatarUrl: string | null; cuisineName: string; mealCount: number; firstMealAt: Date }> = [];

    for (const [userId, stats] of userStats.entries()) {
      const user = userMap.get(userId);

      if (user) {
        // 如果指定了菜系，只统计该菜系
        if (cuisineName) {
          if (stats.cuisines.has(cuisineName)) {
            // 需要重新查询该用户在该菜系下的具体数据
            const cuisineMeals = meals.filter(m => m.userId === userId && m.cuisine === cuisineName);
            if (cuisineMeals.length > 0) {
              const firstMeal = cuisineMeals.reduce((earliest, m) =>
                new Date(m.createdAt) < new Date(earliest.createdAt) ? m : earliest
              );
              rankings.push({
                userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                cuisineName: cuisineName,
                mealCount: cuisineMeals.length,
                firstMealAt: new Date(firstMeal.createdAt),
              });
            }
          }
        } else {
          // 没有指定菜系，显示用户的总菜品数，菜系名称显示为"全部"
          rankings.push({
            userId,
            username: user.username,
            avatarUrl: user.avatarUrl,
            cuisineName: '全部菜系',
            mealCount: stats.count,
            firstMealAt: stats.firstMealAt,
          });
        }
      }
    }

    // 按 mealCount 降序排序，然后按 firstMealAt 升序排序
    rankings.sort((a, b) => {
      if (b.mealCount !== a.mealCount) {
        return b.mealCount - a.mealCount;
      }
      return a.firstMealAt.getTime() - b.firstMealAt.getTime();
    });

    // 取前 100 名
    const topRankings = rankings.slice(0, 100);

    // 格式化返回数据
    const masters: CuisineMasterEntry[] = topRankings.map((r, index) => ({
      rank: index + 1,
      userId: r.userId,
      username: r.username,
      avatarUrl: r.avatarUrl,
      cuisineName: r.cuisineName,
      mealCount: r.mealCount,
      firstMealAt: r.firstMealAt.toISOString(),
    }));

    return {
      cuisineName,
      period,
      masters,
    };
  }

  /**
   * 获取综合排行榜
   */
  async getLeaderboard(
    period: RankingPeriod = RankingPeriod.ALL_TIME,
    tier?: string,
  ): Promise<LeaderboardDto> {
    const { startDate } = this.getDateRange(period);

    // 查询愿意参与排行榜的用户 - 需要关联 user_settings 表
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { user_settings: { is: null } },
          { user_settings: { hideRanking: false } },
        ],
        ...(tier && { subscriptionTier: tier as Prisma.EnumSubscriptionTierFilter }),
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userIds = users.map(u => u.id);
    const userMap = new Map(users.map(u => [u.id, u]));

    // 构建查询条件
    const where: Prisma.MealWhereInput = {
      userId: { in: userIds },
      deletedAt: null,
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    // 获取所有餐食记录
    const meals = await this.prisma.meal.findMany({
      where,
      select: {
        userId: true,
        cuisine: true,
        calories: true,
      },
    });

    // 统计每个用户的数据
    const userStats = new Map<string, { mealCount: number; cuisineSet: Set<string>; totalCalories: number }>();

    for (const meal of meals) {
      const existing = userStats.get(meal.userId);

      if (!existing) {
        userStats.set(meal.userId, {
          mealCount: 1,
          cuisineSet: new Set([meal.cuisine]),
          totalCalories: meal.calories || 0,
        });
      } else {
        existing.mealCount++;
        existing.cuisineSet.add(meal.cuisine);
        existing.totalCalories += meal.calories || 0;
      }
    }

    // 构建排行榜数据
    const rankings: LeaderboardEntry[] = [];

    for (const [userId, stats] of userStats.entries()) {
      const user = userMap.get(userId);

      if (user) {
        // 计算得分：餐食数量 * 10 + 菜系数量 * 50
        const score = stats.mealCount * 10 + stats.cuisineSet.size * 50;

        rankings.push({
          rank: 0, // 稍后计算
          userId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          score,
          mealCount: stats.mealCount,
          cuisineCount: stats.cuisineSet.size,
        });
      }
    }

    // 按 score 降序排序
    rankings.sort((a, b) => b.score - a.score);

    // 更新排名
    rankings.forEach((r, index) => {
      r.rank = index + 1;
    });

    // 只返回前 100 名
    const topRankings = rankings.slice(0, 100);

    return {
      period,
      tier,
      leaderboard: topRankings,
    };
  }

  /**
   * 获取排行榜统计数据
   */
  async getRankingStats(period: RankingPeriod = RankingPeriod.ALL_TIME): Promise<RankingStatsDto> {
    const { startDate } = this.getDateRange(period);

    // 统计用户数据（排除 hideRanking: true）- 需要关联 user_settings 表
    const [totalUsers, activeUsersData, totalMealsData] = await Promise.all([
      this.prisma.user.count({
        where: {
          deletedAt: null,
          OR: [
            { user_settings: { is: null } },
            { user_settings: { hideRanking: false } },
          ],
        },
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          OR: [
            { user_settings: { is: null } },
            { user_settings: { hideRanking: false } },
          ],
        },
        select: { id: true },
      }),
      this.prisma.meal.findMany({
        where: {
          deletedAt: null,
          ...(startDate && { createdAt: { gte: startDate } }),
        },
        select: { userId: true, cuisine: true },
      }),
    ]);

    const userIds = new Set(activeUsersData.map(u => u.id));

    // 统计活跃用户（在指定时间段内有餐食记录）
    const activeUserIds = new Set(totalMealsData.map(m => m.userId));
    const activeUsers = [...userIds].filter(id => activeUserIds.has(id)).length;

    // 统计菜系数量
    const cuisineSet = new Set(totalMealsData.map(m => m.cuisine));

    // 计算平均每用户餐食数
    const avgMealsPerUser = totalUsers > 0 ? totalMealsData.length / totalUsers : 0;

    return {
      period,
      totalUsers,
      activeUsers,
      totalMeals: totalMealsData.length,
      totalCuisines: cuisineSet.size,
      avgMealsPerUser: Math.round(avgMealsPerUser * 100) / 100,
    };
  }

  /**
   * 获取美食家榜
   * 统计每个用户的去重后菜系数量，倒序展示
   */
  async getGourmets(period: RankingPeriod = RankingPeriod.ALL_TIME): Promise<GourmetsDto> {
    const { startDate } = this.getDateRange(period);

    // 查询愿意参与排行榜的用户
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { user_settings: { is: null } },
          { user_settings: { hideRanking: false } },
        ],
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // 构建查询条件
    const where: Prisma.MealWhereInput = {
      userId: { in: Array.from(userMap.keys()) },
      deletedAt: null,
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    // 获取所有餐食记录
    const meals = await this.prisma.meal.findMany({
      where,
      select: {
        userId: true,
        cuisine: true,
      },
    });

    // 统计每个用户的菜系和餐食数量
    const userCuisineStats = new Map<string, { cuisineSet: Set<string>; mealCount: number }>();

    for (const meal of meals) {
      const existing = userCuisineStats.get(meal.userId);

      if (!existing) {
        userCuisineStats.set(meal.userId, {
          cuisineSet: new Set([meal.cuisine]),
          mealCount: 1,
        });
      } else {
        existing.cuisineSet.add(meal.cuisine);
        existing.mealCount++;
      }
    }

    // 构建排行榜数据
    const gourmets: GourmetEntry[] = [];

    for (const [userId, stats] of userCuisineStats.entries()) {
      const user = userMap.get(userId);

      if (user) {
        gourmets.push({
          rank: 0, // 稍后计算
          userId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          cuisineCount: stats.cuisineSet.size,
          mealCount: stats.mealCount,
          cuisines: Array.from(stats.cuisineSet),
        });
      }
    }

    // 按 cuisineCount 降序排序
    gourmets.sort((a, b) => b.cuisineCount - a.cuisineCount);

    // 更新排名
    gourmets.forEach((g, index) => {
      g.rank = index + 1;
    });

    // 只返回前 100 名
    const topGourmets = gourmets.slice(0, 100);

    return {
      period,
      gourmets: topGourmets,
    };
  }

  /**
   * 获取菜品专家榜
   * 统计每个用户的去重后菜品数量，倒序展示
   * 优化：直接从 dish_unlocks 表读取统计数据，同时从 meals 表获取菜系信息
   */
  async getDishExperts(period: RankingPeriod = RankingPeriod.ALL_TIME): Promise<DishExpertsDto> {
    const { startDate } = this.getDateRange(period);

    // 查询愿意参与排行榜的用户
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { user_settings: { is: null } },
          { user_settings: { hideRanking: false } },
        ],
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userIds = users.map(u => u.id);
    const userMap = new Map(users.map(u => [u.id, u]));

    // 从 dish_unlocks 表获取统计数据
    const where: any = {
      userId: { in: userIds },
    };

    if (startDate) {
      where.firstMealAt = { gte: startDate };
    }

    const unlocks = await this.prisma.dish_unlocks.findMany({
      where,
      select: {
        userId: true,
        dishName: true,
        mealCount: true,
      }
    });

    // 获取菜品对应的菜系信息（从 meals 表）
    const dishNames = unlocks.map(u => u.dishName);
    const mealsForCuisine = await this.prisma.meal.findMany({
      where: {
        foodName: { in: dishNames },
        deletedAt: null,
      },
      select: {
        foodName: true,
        cuisine: true,
      },
      distinct: ['foodName', 'cuisine'],
    });

    // 构建菜品到菜系的映射
    const dishToCuisines = new Map<string, Set<string>>();
    for (const meal of mealsForCuisine) {
      if (!dishToCuisines.has(meal.foodName)) {
        dishToCuisines.set(meal.foodName, new Set());
      }
      dishToCuisines.get(meal.foodName)!.add(meal.cuisine);
    }

    // 统计每个用户的菜品数量和菜系
    const userStats = new Map<string, { count: number; totalMeals: number; dishes: string[]; cuisines: Set<string> }>();

    for (const unlock of unlocks) {
      const existing = userStats.get(unlock.userId);
      const dishCuisines = dishToCuisines.get(unlock.dishName) || new Set();

      if (!existing) {
        userStats.set(unlock.userId, {
          count: 1,
          totalMeals: unlock.mealCount,
          dishes: [unlock.dishName],
          cuisines: dishCuisines,
        });
      } else {
        existing.count++;
        existing.totalMeals += unlock.mealCount;
        existing.dishes.push(unlock.dishName);
        dishCuisines.forEach(c => existing.cuisines.add(c));
      }
    }

    // 构建排行榜数据
    const experts: DishExpertEntry[] = [];

    for (const [userId, stats] of userStats.entries()) {
      const user = userMap.get(userId);

      if (user) {
        experts.push({
          rank: 0,
          userId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          dishCount: stats.count,
          mealCount: stats.totalMeals,
          dishes: stats.dishes.slice(0, 10), // 只返回前10个菜名示例
          cuisines: Array.from(stats.cuisines).sort(), // 返回所有菜系
        });
      }
    }

    // 按 dishCount 降序排序
    experts.sort((a, b) => b.dishCount - a.dishCount);

    // 更新排名
    experts.forEach((e, index) => {
      e.rank = index + 1;
    });

    // 只返回前 100 名
    const topExperts = experts.slice(0, 100);

    return {
      period,
      experts: topExperts,
    };
  }

  /**
   * 根据时段获取开始日期
   */
  private getDateRange(period: RankingPeriod): { startDate?: Date } {
    const now = new Date();
    let startDate: Date | undefined;

    switch (period) {
      case RankingPeriod.WEEKLY:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case RankingPeriod.MONTHLY:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case RankingPeriod.YEARLY:
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case RankingPeriod.ALL_TIME:
      default:
        startDate = undefined;
        break;
    }

    return { startDate };
  }

  /**
   * 获取菜系专家详情
   * 展示指定用户在指定菜系下的所有菜品
   */
  async getCuisineExpertDetail(
    userId: string,
    cuisineName: string,
    period: RankingPeriod = RankingPeriod.ALL_TIME,
  ): Promise<CuisineExpertDetailDto> {
    const { startDate } = this.getDateRange(period);

    // 获取用户信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 构建查询条件
    const where: Prisma.MealWhereInput = {
      userId,
      cuisine: cuisineName,
      deletedAt: null,
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    // 获取该用户在该菜系下的所有餐食记录
    const meals = await this.prisma.meal.findMany({
      where,
      select: {
        foodName: true,
        cuisine: true,
        createdAt: true,
        imageUrl: true,
        calories: true,
        notes: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (meals.length === 0) {
      return {
        userId: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        cuisineName,
        period,
        totalDishes: 0,
        totalMeals: 0,
        dishes: [],
      };
    }

    // 按菜品名称分组统计
    const dishStats = new Map<string, CuisineExpertDishEntry>();

    for (const meal of meals) {
      const existing = dishStats.get(meal.foodName);

      if (!existing) {
        dishStats.set(meal.foodName, {
          dishName: meal.foodName,
          cuisine: meal.cuisine,
          mealCount: 1,
          firstMealAt: new Date(meal.createdAt).toISOString(),
          lastMealAt: new Date(meal.createdAt).toISOString(),
          imageUrl: meal.imageUrl,
          calories: meal.calories || undefined,
          notes: meal.notes || undefined,
        });
      } else {
        existing.mealCount++;
        existing.lastMealAt = new Date(meal.createdAt).toISOString();
      }
    }

    // 转换为数组并按 mealCount 降序排序
    const dishes = Array.from(dishStats.values()).sort((a, b) => b.mealCount - a.mealCount);

    // 统计总数
    const totalMeals = meals.length;
    const totalDishes = dishes.length;

    return {
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      cuisineName,
      period,
      totalDishes,
      totalMeals,
      dishes,
    };
  }

  /**
   * 获取所有用户的菜品清单
   * 按"用户+菜系"统计菜品数量，倒序排列
   */
  async getAllUsersDishes(period: RankingPeriod = RankingPeriod.WEEKLY): Promise<AllUsersDishesDto> {
    const { startDate } = this.getDateRange(period);

    // 查询愿意参与排行榜的用户
    const allUsers = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { user_settings: { is: null } },
          { user_settings: { hideRanking: false } },
        ],
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userIds = allUsers.map(u => u.id);
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // 构建查询条件
    const where: Prisma.MealWhereInput = {
      userId: { in: userIds },
      deletedAt: null,
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    // 获取所有餐食记录
    const meals = await this.prisma.meal.findMany({
      where,
      select: {
        userId: true,
        foodName: true,
        cuisine: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 按"用户+菜系"分组统计
    const userCuisineStats = new Map<string, {
      userId: string;
      username: string;
      avatarUrl: string | null;
      cuisineName: string;
      dishSet: Set<string>;
      mealCount: number;
      firstMealAt: Date;
    }>();

    for (const meal of meals) {
      const key = `${meal.userId}|${meal.cuisine}`;
      let entry = userCuisineStats.get(key);

      if (!entry) {
        const user = userMap.get(meal.userId);
        if (!user) continue;

        entry = {
          userId: meal.userId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          cuisineName: meal.cuisine,
          dishSet: new Set(),
          mealCount: 0,
          firstMealAt: new Date(meal.createdAt),
        };
        userCuisineStats.set(key, entry);
      }

      entry.dishSet.add(meal.foodName);
      entry.mealCount++;
    }

    // 构建响应数据并按 dishCount 降序排序
    const entries: Array<{
      rank: number;
      userId: string;
      username: string;
      avatarUrl: string | null;
      cuisineName: string;
      dishCount: number;
      mealCount: number;
      firstMealAt: string;
    }> = [];

    for (const stats of userCuisineStats.values()) {
      entries.push({
        rank: 0, // 稍后计算
        userId: stats.userId,
        username: stats.username,
        avatarUrl: stats.avatarUrl,
        cuisineName: stats.cuisineName,
        dishCount: stats.dishSet.size,
        mealCount: stats.mealCount,
        firstMealAt: stats.firstMealAt.toISOString(),
      });
    }

    // 按 dishCount 降序排序，然后按 firstMealAt 升序排序
    entries.sort((a, b) => {
      if (b.dishCount !== a.dishCount) {
        return b.dishCount - a.dishCount;
      }
      return new Date(a.firstMealAt).getTime() - new Date(b.firstMealAt).getTime();
    });

    // 更新排名
    entries.forEach((e, index) => {
      e.rank = index + 1;
    });

    // 统计总用户数和总菜系数
    const uniqueUsers = new Set(entries.map(e => e.userId));
    const uniqueCuisines = new Set(entries.map(e => e.cuisineName));

    return {
      period,
      totalEntries: entries.length,
      totalUsers: uniqueUsers.size,
      totalCuisines: uniqueCuisines.size,
      entries,
    };
  }

  /**
   * 获取用户已解锁的菜肴
   * 从 dish_unlocks 表读取用户所有已解锁的菜肴
   */
  async getUserUnlockedDishes(userId: string): Promise<UserUnlockedDishesDto> {
    // 获取用户信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 从 dish_unlocks 表获取用户已解锁的菜肴
    const unlocks = await this.prisma.dish_unlocks.findMany({
      where: { userId },
      select: {
        dishName: true,
        mealCount: true,
        firstMealAt: true,
        lastMealAt: true,
      },
      orderBy: { lastMealAt: 'desc' },
    });

    // 获取菜品的详细信息（菜系、图片、热量等）
    const dishNames = unlocks.map(u => u.dishName);
    const mealsInfo = await this.prisma.meal.findMany({
      where: {
        foodName: { in: dishNames },
        userId,
        deletedAt: null,
      },
      select: {
        foodName: true,
        cuisine: true,
        imageUrl: true,
        calories: true,
      },
      distinct: ['foodName'],
    });

    // 构建菜品信息映射
    const dishInfoMap = new Map<string, { cuisine: string; imageUrl?: string; calories?: number }>();
    for (const meal of mealsInfo) {
      dishInfoMap.set(meal.foodName, {
        cuisine: meal.cuisine,
        imageUrl: meal.imageUrl || undefined,
        calories: meal.calories || undefined,
      });
    }

    // 构建响应数据
    const dishes: UnlockedDishEntry[] = unlocks.map(unlock => {
      const info = dishInfoMap.get(unlock.dishName);
      return {
        dishName: unlock.dishName,
        cuisine: info?.cuisine || '未知',
        mealCount: unlock.mealCount,
        firstMealAt: unlock.firstMealAt.toISOString(),
        lastMealAt: unlock.lastMealAt?.toISOString() || unlock.firstMealAt.toISOString(),
        imageUrl: info?.imageUrl,
        calories: info?.calories,
      };
    });

    // 按 mealCount 降序排序
    dishes.sort((a, b) => b.mealCount - a.mealCount);

    // 统计总数
    const totalMeals = dishes.reduce((sum, d) => sum + d.mealCount, 0);

    return {
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      totalDishes: dishes.length,
      totalMeals,
      dishes,
    };
  }
}
