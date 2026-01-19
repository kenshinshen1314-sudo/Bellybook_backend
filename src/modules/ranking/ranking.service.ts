import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CuisineMastersDto, LeaderboardDto, RankingStatsDto, GourmetsDto, DishExpertsDto, CuisineMasterEntry, LeaderboardEntry, GourmetEntry, DishExpertEntry } from './dto/ranking-response.dto';
import { RankingPeriod } from './dto/ranking-query.dto';

@Injectable()
export class RankingService {
  private readonly logger = new Logger(RankingService.name);

  constructor(private prisma: PrismaService) {}

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
    const where: any = {
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
        user_settings: {
          hideRanking: false,
        },
        ...(tier && { subscriptionTier: tier as any }),
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
    const where: any = {
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
          user_settings: {
            hideRanking: false,
          },
        },
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          user_settings: {
            hideRanking: false,
          },
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
        user_settings: {
          hideRanking: false,
        },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // 构建查询条件
    const where: any = {
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
   */
  async getDishExperts(period: RankingPeriod = RankingPeriod.ALL_TIME): Promise<DishExpertsDto> {
    const { startDate } = this.getDateRange(period);

    // 查询愿意参与排行榜的用户
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        user_settings: {
          hideRanking: false,
        },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // 构建查询条件
    const where: any = {
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
        foodName: true,
      },
    });

    // 统计每个用户的菜品和餐食数量
    const userDishStats = new Map<string, { dishSet: Set<string>; mealCount: number }>();

    for (const meal of meals) {
      const existing = userDishStats.get(meal.userId);

      if (!existing) {
        userDishStats.set(meal.userId, {
          dishSet: new Set([meal.foodName]),
          mealCount: 1,
        });
      } else {
        existing.dishSet.add(meal.foodName);
        existing.mealCount++;
      }
    }

    // 构建排行榜数据
    const experts: DishExpertEntry[] = [];

    for (const [userId, stats] of userDishStats.entries()) {
      const user = userMap.get(userId);

      if (user) {
        experts.push({
          rank: 0, // 稍后计算
          userId,
          username: user.username,
          avatarUrl: user.avatarUrl,
          dishCount: stats.dishSet.size,
          mealCount: stats.mealCount,
          dishes: Array.from(stats.dishSet),
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
}
