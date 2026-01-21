/**
 * [INPUT]: 依赖 PrismaService 的数据库访问能力
 * [OUTPUT]: 对外提供用户详情相关查询（菜系专家详情、用户菜品清单）
 * [POS]: ranking 模块的用户详情查询服务
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RankingPeriod } from '@prisma/client';
import {
  CuisineExpertDetailDto,
  CuisineExpertDishEntry,
  AllUsersDishesDto,
  UserUnlockedDishesDto,
  UnlockedDishEntry,
} from '../dto/ranking-response.dto';

@Injectable()
export class UserDetailsQuery {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取菜系专家详情
   * 展示指定用户在指定菜系下的所有菜品
   */
  async getCuisineExpertDetail(
    userId: string,
    cuisineName: string,
    period: RankingPeriod,
  ): Promise<CuisineExpertDetailDto> {
    const { startDate } = this.getDateRange(period);

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

    const where: any = {
      userId,
      cuisine: cuisineName,
      deletedAt: null,
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

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

    return {
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      cuisineName,
      period,
      totalDishes: dishes.length,
      totalMeals: meals.length,
      dishes,
    };
  }

  /**
   * 获取所有用户的菜品清单
   * 按"用户+菜系"统计菜品数量，倒序排列
   */
  async getAllUsersDishes(period: RankingPeriod): Promise<AllUsersDishesDto> {
    const { startDate } = this.getDateRange(period);

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

    const where: any = {
      userId: { in: userIds },
      deletedAt: null,
    };

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

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
        rank: 0,
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
    entries.forEach((e, index) => { e.rank = index + 1; });

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
    const dishInfoMap = new Map<string, {
      cuisine: string;
      imageUrl?: string;
      calories?: number;
    }>();

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
